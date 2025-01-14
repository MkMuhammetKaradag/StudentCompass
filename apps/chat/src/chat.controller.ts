import { Controller, Get, Inject } from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  AddParticipantInput,
  ChatCommands,
  ChatType,
  CreateChatInput,
  SharedService,
  WithCurrentUserId,
} from '@app/shared';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  private async handleMessage<T>(
    context: RmqContext,
    handler: () => Promise<T>,
  ): Promise<T> {
    try {
      this.sharedService.acknowledgeMessage(context);
      return await handler();
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  @EventPattern(ChatCommands.CREATE_CHAT_CLASSROOM)
  async sendNotification(
    @Ctx() context: RmqContext,
    @Payload()
    input: {
      chatName: string;
      classRoomId: string;
      adminId: string;
      type: ChatType;
    },
  ) {
    try {
      await this.chatService.createChatClassRoom(input);
      this.sharedService.acknowledgeMessage(context);
    } catch (error) {
      console.error('Error processing message:', error);
      // const retryCount =
      //   context.getMessage()?.properties?.headers?.['x-retry-count'] || 0;
      const retryCount = context.getMessage()?.fields?.deliveryTag || 0;
      console.log(retryCount);
      await this.sharedService.nacknowledgeMessage(context, retryCount);
      throw error;
    }
  }

  @MessagePattern({
    cmd: ChatCommands.CREATE_CHAT,
  })
  async createChat(
    @Ctx() context: RmqContext,
    @Payload() input: WithCurrentUserId<CreateChatInput>,
  ) {
    return this.handleMessage(context, () =>
      this.chatService.createChat(input),
    );
  }

  @MessagePattern({
    cmd: ChatCommands.GET_MY_CHATS,
  })
  async getMyChats(
    @Ctx() context: RmqContext,
    @Payload() input: WithCurrentUserId,
  ) {
    return this.handleMessage(context, () =>
      this.chatService.getMyChats(input.currentUserId),
    );
  }

  @MessagePattern({
    cmd: ChatCommands.LEAVE_CHAT,
  })
  async leaveChat(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      chatId: string;
    }>,
  ) {
    return this.handleMessage(context, () => this.chatService.leaveChat(input));
  }

  @MessagePattern({
    cmd: ChatCommands.ADD_PARTICIPANT,
  })
  async addParticipant(
    @Ctx() context: RmqContext,
    @Payload() input: WithCurrentUserId<AddParticipantInput>,
  ) {
    return this.handleMessage(context, () =>
      this.chatService.addParticipant(input),
    );
  }

  @MessagePattern({
    cmd: ChatCommands.REMOVE_PARTICIPANT,
  })
  async reomveParticipant(
    @Ctx() context: RmqContext,
    @Payload() input: WithCurrentUserId<AddParticipantInput>,
  ) {
    return this.handleMessage(context, () =>
      this.chatService.removeParticipant(input),
    );
  }

  @MessagePattern({
    cmd: ChatCommands.CHECK_CHAT_PARTICIPANT,
  })
  async checkChatParticipant(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      chatId: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.chatService.checkChatParticipant(input),
    );
  }

  @MessagePattern({
    cmd: ChatCommands.ADD_CHAT_ADMIN,
  })
  async addChatAdmin(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      chatId: string;
      userId: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.chatService.addChatAdmin(input),
    );
  }

  @MessagePattern({
    cmd: ChatCommands.REMOVE_CHAT_ADMIN,
  })
  async removeChatAdmin(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      chatId: string;
      userId: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.chatService.removeChatAdmin(input),
    );
  }
}
