import {
  ActivationUserInput,
  AuthCommands,
  AuthGuard,
  AuthUser,
  CurrentUser,
  GqlAuthGuard,
  PUB_SUB,
  RedisService,
  ResetPasswordInput,
  SignInObject,
  SignInput,
  SignUpInput,
  SignUpObject,
  User,
} from '@app/shared';
import { HttpStatus, Inject, Session, UseGuards } from '@nestjs/common';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  Subscription,
} from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';
import { ChangeUserStatusObject } from '../types/Auth/Object/ChangeUserStatusObject';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { BroadcastPublisherService } from '@app/shared/services/broadcast.publisher.service';
import { ROUTING_KEYS } from '@app/shared/services/broadcast.consumer.service';
const CHANGE_USER_STATUS = 'changeUserStatus';

@Resolver('auth')
export class AuthResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
    private redisService: RedisService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,

    @Inject('EMAIL_SERVICE')
    private readonly emailService: ClientProxy,

    private readonly broadcastService: BroadcastPublisherService,
  ) {}

  /**
   * Çerezleri güvenli bir şekilde ayarlamak için yardımcı yöntem.
   */
  private setCookies(
    res: any,
    tokens: { refreshToken?: string; accessToken?: string; sessionId?: string },
  ): void {
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
    };

    if (tokens.refreshToken) {
      res.cookie('refresh_token', tokens.refreshToken, options);
    }
    if (tokens.accessToken) {
      res.cookie('access_token', tokens.accessToken, options);
    }
    if (tokens.sessionId) {
      res.cookie('session_id', tokens.sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict', // CSRF koruması
        maxAge: 1000 * 60 * 60 * 24, // 1 gün
      });
    }
  }
  private async sendCommand<T>(cmd: AuthCommands, payload: any): Promise<T> {
    try {
      return await firstValueFrom<T>(this.authService.send({ cmd }, payload).pipe(
        timeout(5000),
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            return throwError(() => new Error('Request timed out.'));
          }
          return throwError(() => error);
        }
      )));
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    console.log(error);
    this.logger.error(`Exception: ${message} ${JSON.stringify(error)}`);
    throw new GraphQLError(error.message || message, {
      extensions: {
        code: error.statusCode || statusCode,
        error,
      },
    });
  }
  private getClientIp(req: Request): string | null {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      return '127.0.0.1';
    }

    // x-forwarded-for öncelikli olarak kontrol edilir
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      return Array.isArray(xForwardedFor)
        ? xForwardedFor[0].split(',')[0].trim()
        : xForwardedFor.split(',')[0].trim();
    }

    // Güncel ve desteklenen IP alma yöntemleri
    const ipOptions = [req.ip, req.socket?.remoteAddress];

    for (const ip of ipOptions) {
      if (ip && ip !== '::1' && ip !== '127.0.0.1') {
        return ip;
      }
    }

    return null;
  }

  // Register User
  @Mutation(() => SignUpObject)
  async signUp(@Args('input') input: SignUpInput): Promise<SignUpObject> {
    return this.sendCommand<SignUpObject>(AuthCommands.SIGN_UP, input);
  }

  // Activate User
  @Mutation(() => User)
  async activationUser(
    @Args('input') input: ActivationUserInput,
  ): Promise<User> {
    return this.sendCommand<User>(AuthCommands.ACTIVATE_USER, input);
  }
  //login User
  @Mutation(() => User)
  async signIn(
    @Args('input') input: SignInput,
    @Context() context,
  ): Promise<User> {
    const { req, res } = context;
    const userAgent = req.headers['user-agent'];
    const clientIp = this.getClientIp(req);

    const data = await this.sendCommand<User>(AuthCommands.SIGN_IN, input);
    const sessionId = data._id;
    await this.redisService.setSession(
      sessionId,
      {
        user: {
          _id: data._id,
          email: data.email,
          firstName: data.firstName,
          roles: data.roles,
        },
        userAgent,
        clientIp,
        loggedInAt: new Date().toISOString(),
      },
      24 * 60 * 60,
    );
    this.setCookies(res, {
      sessionId: sessionId,
    });
    return data;
  }

  @Query(() => String)
  @UseGuards(AuthGuard)
  async gethello(@CurrentUser() user: AuthUser, @Context() context) {
    const { req, res, session } = context;
    console.log('session-redis', session);

    return 'hello';
  }

  @Query(() => User)
  @UseGuards(AuthGuard)
  async me(@Context() context, @CurrentUser() user: any) {
    // this.emailService.emit(
    //   {
    //     cmd: 'forgot_password',
    //   },
    //   {
    //     email: 'karadag2947@gmail.com',
    //     template_name: 'forgot_password.html',
    //     activation_code: 'http://localhost:3000/1234',
    //     userName: 'karadag',
    //   },
    // );

    // this.broadcastService.broadcast(ROUTING_KEYS.USER_NEW, {
    //   coachId: 'request.coach',
    //   studentId: 'request.student._id',
    // });
    return user;
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async logout(
    @Context() context: { res: Response },
    @CurrentUser() user: AuthUser,
  ) {
    const { res } = context;
    try {
      await this.redisService.logoutSession(user._id);
      res.clearCookie('session_id', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      // await this.userService.updateUserStatus(user._id, 'offline');
      return 'successfully logged out ';
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  @Mutation(() => String)
  async forgotPassword(@Args('email') email: string) {
    return this.sendCommand<String>(AuthCommands.FORGOT_PASSWORD, {
      email,
    });
  }

  @Mutation(() => String)
  async resetPassword(@Args('input') input: ResetPasswordInput) {
    return this.sendCommand<String>(AuthCommands.RESET_PASSWORD, {
      password: input.password,
      token: input.token,
    });
  }
}
