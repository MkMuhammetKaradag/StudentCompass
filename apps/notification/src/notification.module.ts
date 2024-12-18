import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import {
  MongoDBModule,
  Notification,
  NotificationSchema,
  PubSubModule,
  SharedModule,
  SharedService,
} from '@app/shared';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    MongoDBModule.forRoot('NOTIFICATION', 'notification'),
    MongooseModule.forFeature(
      [{ name: Notification.name, schema: NotificationSchema }],
      'notification',
    ),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class NotificationModule {}
