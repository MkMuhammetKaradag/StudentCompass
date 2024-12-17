import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import {
  CoachingRequest,
  CoachingRequestSchema,
  MongoDBModule,
  PubSubModule,
  SharedModule,
  SharedService,
  User,
  UserSchema,
} from '@app/shared';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentController } from './Student/student.controller';
import { StudentService } from './Student/student.service';
import { CoachController } from './Coach/coach.controller';
import { CoachService } from './Coach/coach.service';

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    MongoDBModule.forRoot('USER', 'user'),
    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema },
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
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class UserModule {}
