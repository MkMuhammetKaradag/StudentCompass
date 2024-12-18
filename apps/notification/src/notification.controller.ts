import { Controller, Get, Inject } from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  NotificationCommands,
  NotificationType,
  SharedService,
  WithCurrentUserId,
} from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
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

  @MessagePattern({ cmd: NotificationCommands.GET_NOTIFICATION })
  async getNotification(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId,
  ) {
    return this.handleMessage(context, () =>
      this.notificationService.getNotification(input.currentUserId),
    );
  }

  @MessagePattern({ cmd: NotificationCommands.SEND_NOTIFICATION })
  async sendNotification(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      senderId: string;
      recipientIds: string[];
      message: string;
      type?: NotificationType;
    },
  ) {
    console.log('first');
    return this.handleMessage(context, () =>
      this.notificationService.sendNotification(
        payload.senderId,
        payload.recipientIds,
        payload.message,
        payload.type,
      ),
    );
  }
}
