import {
  AuthGuard,
  AuthUser,
  CoachCommands,
  CoachingRequest,
  CoachingRequestStatus,
  CurrentUser,
  GetCoachingRequestInput,
  PUB_SUB,
  RedisService,
  ResetPasswordInput,
  RolesGuard,
  SendCoachingRequestInput,
  StudentCommands,
  UpdateCoachingRequestInput,
  User,
  UserCommands,
  UserRole,
} from '@app/shared';
import { HttpStatus, Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { RedisPubSub } from 'graphql-redis-subscriptions';

import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { Roles } from '@app/shared/common/decorators/roles.decorator';

@Resolver('user')
export class UserResolver {
  constructor(
    @Inject('USER_SERVICE')
    private readonly authService: ClientProxy,
    private redisService: RedisService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    this.logger.error(`Exception: ${message} ${JSON.stringify(error)}`);
    throw new GraphQLError(error.message || message, {
      extensions: {
        code: error.statusCode || statusCode,
        cause: error.cause,
      },
    });
  }
  private async sendCommand<T>(cmd: UserCommands, payload: any): Promise<T> {
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


  
}
