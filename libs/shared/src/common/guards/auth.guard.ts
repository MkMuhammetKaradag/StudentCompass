import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@app/shared/Type/request/authenticatedRequest';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { request, response } = this.getRequestResponse(context);
    const jwt = request.cookies['access_token'];
    if (!jwt) {
      return this.handleUnauthorized(request, response);
    }

    try {
      const { user, exp } = await firstValueFrom(
        this.authService.send({ cmd: 'verify_access_token' }, jwt),
      );
      const TOKEN_EXP_MS = exp * 1000;

      if (Date.now() < TOKEN_EXP_MS) {
        request.user = user;
        return true;
      } else {
        return this.refreshToken(request, response);
      }
    } catch (error) {
      return this.refreshToken(request, response);
    }
  }

  private getRequestResponse(context: ExecutionContext) {
    if (context.getType().toString() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      return {
        request: gqlContext.getContext().req,
        response: gqlContext.getContext().res,
      };
    } else {
      return {
        request: context.switchToHttp().getRequest<Request>(),
        response: context.switchToHttp().getResponse<Response>(),
      };
    }
  }

  private async refreshToken(
    request: AuthenticatedRequest,
    response: Response,
  ): Promise<boolean> {
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) {
      console.log('refresh token yok');
      return false;
    }

    try {
      const { access_token, user } = await firstValueFrom(
        this.authService.send({ cmd: 'refresh_access_token' }, refreshToken),
      );

      if (!access_token) {
        return false;
      }

      request.headers['authorization'] = `Bearer ${access_token}`;
      response.cookie('access_token', access_token);
      request.user = user;

      return true;
    } catch (error) {
      return false;
    }
  }

  private handleUnauthorized(
    request: AuthenticatedRequest,
    response: Response,
  ): boolean {
    return false;
  }
}
