import {
  AddParticipantInput,
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
  GetUserChatsObject,
  Message,
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
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { RedisPubSub } from 'graphql-redis-subscriptions';

import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { Roles } from '@app/shared/common/decorators/roles.decorator';
const SEND_MESSAGE = 'sendMessageToChat';
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

  @UseGuards(AuthGuard)
  @Query(() => [GetUserChatsObject])
  async getMyChats(@CurrentUser() user: AuthUser) {
    const data = await this.sendCommand<GetUserChatsObject[]>(
      ChatCommands.GET_MY_CHATS,
      {
        currentUserId: user._id,
      },
    );

    return data;
  }

  @UseGuards(AuthGuard)
  @Mutation(() => String)
  async leaveChat(
    @Args('chatId') chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.sendCommand<String>(ChatCommands.LEAVE_CHAT, {
      currentUserId: user._id,
      payload: {
        chatId,
      },
    });

    return data;
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Chat)
  async addParticipant(
    @Args('input') input: AddParticipantInput,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.sendCommand<Chat>(ChatCommands.ADD_PARTICIPANT, {
      currentUserId: user._id,
      payload: input,
    });

    return data;
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Chat)
  async removeParticipant(
    @Args('input') input: AddParticipantInput,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.sendCommand<Chat>(ChatCommands.REMOVE_PARTICIPANT, {
      currentUserId: user._id,
      payload: input,
    });

    return data;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.COACH, UserRole.ADMIN)
  @Subscription(() => Message, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        this.handleError('user not found', HttpStatus.NOT_FOUND);
      }

      return payload.sendMessageToChat.chatId == variables.chatId;
    },
  })
  async sendMessageToChat(
    @Args('chatId') chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.sendCommand<boolean>(
      ChatCommands.CHECK_CHAT_PARTICIPANT,
      {
        currentUserId: user._id,
        payload: {
          chatId,
        },
      },
    );
    if (!data) {
      this.handleError(
        'you arre not authorized to listen to this  chat ',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.pubSub.asyncIterator(SEND_MESSAGE);
  }
}
