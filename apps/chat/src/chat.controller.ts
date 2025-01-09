import { Controller, Get, Inject } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatCommands, ChatType, SharedService } from '@app/shared';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

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
      classRoomId: string;
      adminId: string;
      type: ChatType;
    },
  ) {
    try {
      await this.chatService.CreateChatClassRoom(input);
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
}
