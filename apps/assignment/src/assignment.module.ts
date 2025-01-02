import { Module } from '@nestjs/common';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import {
  Assignment,
  AssignmentSchema,
  AssignmentSubmission,
  AssignmentSubmissionSchema,
  BroadcastConsumerService,
  ClassRoom,
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

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    SharedModule.registerBroadcastExchange(),
    MongoDBModule.forRoot('ASSIGNMENT', 'assignment'),
    MongooseModule.forFeature(
      [
        { name: Assignment.name, schema: AssignmentSchema },
        { name: User.name, schema: UserSchema },
        { name: AssignmentSubmission.name, schema: AssignmentSubmissionSchema },
        { name: ClassRoom.name, schema: ClassRoomSchema },
      ],
      'assignment',
    ),
  ],
  controllers: [AssignmentController, BroadcastController],
  providers: [
    AssignmentService,
    BroadcastConsumerService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class AssignmentModule {}
