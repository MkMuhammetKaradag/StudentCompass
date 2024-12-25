import { Module, OnModuleInit } from '@nestjs/common';
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
import { BroadcastConsumerService } from '@app/shared/services/broadcast.consumer.service';
import { BroadcastController } from './broadcast.controller';

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    SharedModule.registerBroadcastExchange(),
    MongoDBModule.forRoot('NOTIFICATION', 'notification'),
    MongooseModule.forFeature(
      [{ name: Notification.name, schema: NotificationSchema }],
      'notification',
    ),
  ],
  controllers: [NotificationController, BroadcastController],
  providers: [
    NotificationService,
    BroadcastConsumerService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class NotificationModule {}
// export class NotificationModule implements OnModuleInit {
//   // constructor(private readonly consumerService: BroadcastConsumerService) {}
//   // async onModuleInit() {
//   //   await this.consumerService.consume((msg) => {
//   //     console.log('Processed broadcast message:', msg);
//   //   });
//   // }
// }
