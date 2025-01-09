import { Module } from '@nestjs/common';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import {
  ClassRoom,
  ClassRoomJoinLink,
  ClassRoomJoinLinkSchema,
  ClassRoomSchema,
  MongoDBModule,
  PubSubModule,
  SharedModule,
  SharedService,
  User,
  UserSchema,
} from '@app/shared';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BroadcastController } from './broadcast.controller';
import { BroadcastConsumerService } from '@app/shared/services/broadcast.consumer.service';

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SharedModule,
    SharedModule.registerBroadcastExchange(),
    SharedModule.registerRmq('NOTIFICATION_SERVICE', 'NOTIFICATION'),

    SharedModule.registerRmq('CHAT_SERVICE', 'CHAT'),
    SharedModule.registerRpcClient('CHAT_SERVICE', 'CHAT'),
    
    MongoDBModule.forRoot('CLASSROOME', 'classRoome'),

    MongooseModule.forFeature(
      [
        { name: ClassRoom.name, schema: ClassRoomSchema },
        { name: ClassRoomJoinLink.name, schema: ClassRoomJoinLinkSchema },
        { name: User.name, schema: UserSchema },
      ],
      'classRoome',
    ),
  ],
  controllers: [ClassController, BroadcastController],
  providers: [
    ClassService,
    BroadcastConsumerService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class ClassModule {}
