import {
  ActivationUserInput,
  AuthCommands,
  AuthGuard,
  AuthUser,
  CurrentUser,
  SignInObject,
  SignInput,
  SignUpInput,
  SignUpObject,
  User,
} from '@app/shared';
import { HttpStatus, Inject, UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { firstValueFrom } from 'rxjs';

@Resolver('auth')
export class AuthResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}

  /**
   * Çerezleri güvenli bir şekilde ayarlamak için yardımcı yöntem.
   */
  private setCookies(
    res: any,
    tokens: { refreshToken?: string; accessToken?: string },
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
  ): Promise<SignInObject> {
    const { req, res } = context;
    try {
      const data = await this.sendCommand<SignInObject>(
        AuthCommands.SIGN_IN,
        input,
      );

      this.setCookies(res, {
        refreshToken: data.refresh_token,
        accessToken: data.access_token,
      });

      return data;
    } catch (error) {
      this.handleError('Sign-in failed.', HttpStatus.UNAUTHORIZED, error);
    }
  }

  @Query(() => String)
  @UseGuards(AuthGuard)
  async gethello(@CurrentUser() user: AuthUser) {
    console.log(user);
    return 'hello';
  }
}
