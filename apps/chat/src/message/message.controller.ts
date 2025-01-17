import {
  GetChatMessagesInput,
  Message,
  MessageCommands,
  SendMessageInput,
  SharedService,
  WithCurrentUserId,
} from '@app/shared';
import { Controller, Inject } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { MessageService } from './message.service';

@Controller()
export class MessageController {
  constructor(
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
    private readonly messageService: MessageService,
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
  @MessagePattern({
    cmd: MessageCommands.SEND_MESSAGE,
  })
  async sendMessage(
    @Ctx() context: RmqContext,
    @Payload() input: WithCurrentUserId<SendMessageInput>,
  ): Promise<Message> {
    return this.handleMessage(context, () =>
      this.messageService.sendMessage(input),
    );
  }

  @MessagePattern({
    cmd: MessageCommands.GET_CHAT_MESSAGES,
  })
  async getChatMessages(
    @Ctx() context: RmqContext,
    @Payload() input: WithCurrentUserId<GetChatMessagesInput>,
  ) {
    return this.handleMessage(context, () =>
      this.messageService.getChatMessages(input),
    );
  }

  @MessagePattern({
    cmd: MessageCommands.MARK_MESSAGES_AS_READ,
  })
  async markMessagesAsRead(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      messageIds: string[];
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.messageService.markMessagesAsRead(input),
    );
  }

  @MessagePattern({
    cmd: MessageCommands.DELETE_MESSAGE,
  })
  async deleteMessage(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      messageId: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.messageService.deleteMessage(input),
    );
  }
  @MessagePattern({
    cmd: MessageCommands.EDIT_MESSAGE,
  })
  async editMessage(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      messageId: string;
      content: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.messageService.editMessage(input),
    );
  }
}
