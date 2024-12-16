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
import { RedisService } from '@app/shared/services/redis.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
    private redisService: RedisService,
  ) {}
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
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { request, response } = this.getRequestResponse(context);
    try {
      const sessionId = request.cookies['session_id'];

      if (!sessionId) {
        return false;
      }
      const data = await this.redisService.getSession(sessionId, 'user-agent');

      if (!data.user) {
        return false;
      }

      const currentClientIp = this.getClientIp(request);
      console.log(data.clientIp, currentClientIp);
      if (currentClientIp != data.clientIp) {
        return false;
      }
      request.user = data.user;
      console.log('return true');
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }

    // const jwt = request.cookies['access_token'];

    // if (request?.session?.context) {
    //   const sessionData = request.session.context;
    // }
    // if (!jwt) {
    //   return this.handleUnauthorized(request, response);
    // }

    // try {
    //   const { user, exp } = await firstValueFrom(
    //     this.authService.send({ cmd: 'verify_access_token' }, jwt),
    //   );
    //   const TOKEN_EXP_MS = exp * 1000;

    //   if (Date.now() < TOKEN_EXP_MS) {
    //     request.user = user;
    //     return true;
    //   } else {
    //     return this.refreshToken(request, response);
    //   }
    // } catch (error) {
    //   return this.refreshToken(request, response);
    // }
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
