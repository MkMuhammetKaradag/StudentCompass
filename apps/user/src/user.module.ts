import { Module, OnModuleInit } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import {
  Coach,
  CoachingRequest,
  CoachingRequestSchema,
  CoachSchema,
  MongoDBModule,
  PubSubModule,
  SharedModule,
  SharedService,
  Student,
  StudentSchema,
  User,
  UserSchema,
} from '@app/shared';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentController } from './Student/student.controller';
import { StudentService } from './Student/student.service';
import { CoachController } from './Coach/coach.controller';
import { CoachService } from './Coach/coach.service';
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
    MongoDBModule.forRoot('USER', 'user'),
    MongooseModule.forFeature(
      [
        {
          name: User.name,
          schema: UserSchema,
        },
        {
          name: CoachingRequest.name,
          schema: CoachingRequestSchema,
        },
      ],
      'user',
    ),
  ],
  controllers: [UserController, StudentController, CoachController],
  providers: [
    UserService,
    StudentService,
    CoachService,
    BroadcastConsumerService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class UserModule implements OnModuleInit {
  constructor(private readonly consumerService: BroadcastConsumerService) {}

  async onModuleInit() {
    await this.consumerService.consume((msg) => {
      console.log('Processed broadcast message:', msg);
    });
  }
}
