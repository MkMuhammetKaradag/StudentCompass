import {
  AuthGuard,
  AuthUser,
  Chat,
  ChatCommands,
  CoachCommands,
  CoachingRequest,
  CoachingRequestStatus,
  CreateChatInput,
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

@Resolver('chat')
export class ChatResolver {
  constructor(
    @Inject('CHAT_SERVICE')
    private readonly chatService: ClientProxy,
    @Inject('CHAT_SERVICE_RPC')
    private readonly chatRpcService: ClientProxy,

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
  private async sendCommand<T>(cmd: ChatCommands, payload: any): Promise<T> {
    try {
      return await firstValueFrom<T>(
        this.chatRpcService.send({ cmd }, payload),
      );
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH, UserRole.STUDENT, UserRole.ADMIN)
  @Mutation(() => Chat)
  async createChat(
    @Args('input') input: CreateChatInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Chat> {
    const data = await this.sendCommand<Chat>(ChatCommands.CREATE_CHAT, {
      currentUserId: user._id,
      payload: input,
    });

    return data;
  }
}
