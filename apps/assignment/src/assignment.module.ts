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
  Task,
  TaskSchema,
  User,
  UserSchema,
  WeeklyPlan,
  WeeklyPlanSchema,
} from '@app/shared';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BroadcastController } from './broadcast.controller';
import { WeeklyPlanController } from './weeklyPlan/weeklyPlan.controller';
import { WeeklyPlanService } from './weeklyPlan/weeklyPlan.service';

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    SharedModule.registerBroadcastExchange(),
    MongoDBModule.forRoot('ASSIGNMENT', 'assignment'),
    // MongoDBModule.forRoot('WEEKLY_PLANE', 'weeklyPlan'),
    MongooseModule.forFeature(
      [
        { name: Assignment.name, schema: AssignmentSchema },
        { name: User.name, schema: UserSchema },
        { name: AssignmentSubmission.name, schema: AssignmentSubmissionSchema },
        { name: ClassRoom.name, schema: ClassRoomSchema },
        {
          name: WeeklyPlan.name,
          schema: WeeklyPlanSchema,
        },
        {
          name: Task.name,
          schema: TaskSchema,
        },
      ],
      'assignment',
    ),

    // MongooseModule.forFeature(
    //   [
    //     { name: User.name, schema: UserSchema },
    //     { name: ClassRoom.name, schema: ClassRoomSchema },
    //     {
    //       name: WeeklyPlan.name,
    //       schema: WeeklyPlanSchema,
    //     },
    //     {
    //       name: Task.name,
    //       schema: TaskSchema,
    //     },
    //   ],
    //   'weeklyPlan',
    // ),
  ],
  controllers: [
    AssignmentController,
    BroadcastController,
    WeeklyPlanController,
  ],
  providers: [
    AssignmentService,
    WeeklyPlanService,
    BroadcastConsumerService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class AssignmentModule {}
