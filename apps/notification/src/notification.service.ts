import {
  CurrentUser,
  Notification,
  NotificationDocument,
  NotificationType,
} from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name, 'notification')
    private readonly notificationModel: Model<NotificationDocument>,
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
    console.log(recipientIds);
    const notification = new this.notificationModel({
      sender: senderId,
      recipients: recipientIds,
      message,
      type,
    });
    return notification.save();
  }
}
