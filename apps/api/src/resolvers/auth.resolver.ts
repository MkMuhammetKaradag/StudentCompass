import {
  ActivationUserInput,
  AuthCommands,
  AuthGuard,
  AuthUser,
  CurrentUser,
  GqlAuthGuard,
  PUB_SUB,
  RedisService,
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
import { firstValueFrom } from 'rxjs';
import { Session as SessionDoc } from 'express-session';
import { ChangeUserStatusObject } from '../types/Auth/Object/ChangeUserStatusObject';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Request } from 'express';
const CHANGE_USER_STATUS = 'changeUserStatus';

@Resolver('auth')
export class AuthResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
    private redisService: RedisService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
      return await firstValueFrom<T>(this.authService.send({ cmd }, payload));
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
    throw new GraphQLError(message, {
      extensions: {
        code: statusCode,
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
  @Mutation(() => SignInObject)
  async signIn(
    @Args('input') input: SignInput,
    @Context() context,
    // @Session() session: SessionDoc,
  ): Promise<SignInObject> {
    const { req, res } = context;
    try {
      const userAgent = req.headers['user-agent'];
      const clientIp = this.getClientIp(req);

      const data = await this.sendCommand<SignInObject>(
        AuthCommands.SIGN_IN,
        input,
      );
      const sessionId = data.user._id;
      await this.redisService.setSession(
        sessionId,
        {
          user: {
            _id: data.user._id,
            email: data.user.email,
            firstName: data.user.firstName,
            roles: data.user.roles,
          },
          userAgent,
          clientIp,
          loggedInAt: new Date().toISOString(),
        },
        24 * 60 * 60,
      );
      this.setCookies(res, {
        // refreshToken: data.refresh_token,
        // accessToken: data.access_token,
        sessionId: sessionId,
      });
      return data;
    } catch (error) {
      console.log(error);
      this.handleError('Sign-in failed.', HttpStatus.UNAUTHORIZED, error);
    }
  }

  @Query(() => String)
  @UseGuards(AuthGuard)
  async gethello(@CurrentUser() user: AuthUser, @Context() context) {
    const { req, res, session } = context;
    console.log('session-redis', session);

    return 'hello';
  }

  @Query(() => String)
  @UseGuards(AuthGuard)
  async me(@Context() context, @CurrentUser() user: any) {
    const sessionId = context.req.sessionID;
    console.log(user);
    // console.log('session-redis', await this.redisService.getSession(sessionId));
    // console.log(context.session);

    return ' context.req.session.user';
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async updateUserStatus(
    @Args('status') status: boolean,
    @CurrentUser() user: AuthUser,
  ): Promise<boolean> {
    const data = await this.sendCommand<boolean>(
      AuthCommands.CHANGE_USER_STATUS,
      {
        userId: user._id,
        status,
      },
    );

    return data;
  }

  @UseGuards(AuthGuard)
  @Subscription(() => ChangeUserStatusObject, {
    filter: async function (payload, variables, context) {
      const { req, res, session } = context;
      // console.log(session);
      // console.log(req);
      // console.log(session);
      if (!req?.user) {
        this.handleError('user not found', HttpStatus.NOT_FOUND);
      }

      return payload.changeUserStatus.userId == variables.userId;
    },
  })
  changeUserStatus(@Args('userId') userId: string) {
    return this.pubSub.asyncIterator(CHANGE_USER_STATUS);
  }
}
