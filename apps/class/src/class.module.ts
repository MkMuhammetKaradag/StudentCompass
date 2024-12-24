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
    MongoDBModule.forRoot('CLASSROOME', 'classRoome'),
    MongooseModule.forFeature(
      [
        { name: ClassRoom.name, schema: ClassRoomSchema },
        { name: ClassRoomJoinLink.name, schema: ClassRoomJoinLinkSchema },
      ],
      'classRoome',
    ),
  ],
  controllers: [ClassController],
  providers: [
    ClassService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class ClassModule {}
