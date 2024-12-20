import {
  CurrentUser,
  Notification,
  NotificationDocument,
  NotificationType,
  PUB_SUB,
} from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name, 'notification')
    private readonly notificationModel: Model<NotificationDocument>,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}
  async getNotification(currentUserId: string) {
    const notifications = await this.notificationModel.find({
      recipients: currentUserId,
    });

    return notifications;
  }

  async sendNotification(
    senderId: string,
    recipientIds: string[],
    message: string,
    type: NotificationType = NotificationType.INFO,
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      sender: senderId,
      recipients: recipientIds,
      message,
      type,
    });

    this.pubSub.publish('userNotifications', {
      userNotifications: {
        _id: notification._id,
        sender: senderId,
        recipients: recipientIds,
        message: notification.message,
        type: notification.type,
      },
    });
    return notification.save();
  }
}
