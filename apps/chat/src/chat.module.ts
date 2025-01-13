import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import {
  BroadcastConsumerService,
  Chat,
  ChatSchema,
  MediaContent,
  MediaContentSchema,
  Message,
  MessageSchema,
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
import { MessageController } from './message/message.controller';
import { MessageService } from './message/message.service';

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    SharedModule.registerBroadcastExchange(),
    MongoDBModule.forRoot('CHAT', 'chat'),

    MongooseModule.forFeature(
      [
        { name: Chat.name, schema: ChatSchema },
        { name: User.name, schema: UserSchema },
        { name: Message.name, schema: MessageSchema },
        {
          name: MediaContent.name,
          schema: MediaContentSchema,
        },
      ],
      'chat',
    ),
  ],
  controllers: [ChatController, BroadcastController, MessageController],
  providers: [
    ChatService,
    MessageService,
    BroadcastConsumerService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class ChatModule {}
