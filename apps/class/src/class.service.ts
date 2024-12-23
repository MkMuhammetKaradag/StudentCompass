import {
  ClassRoom,
  ClassRoomDocument,
  CreateClassInput,
  NotificationDocument,
  PUB_SUB,
  WithCurrentUserId,
} from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model } from 'mongoose';

@Injectable()
export class ClassService {
  constructor(
    @InjectModel(ClassRoom.name, 'classRoome')
    private readonly classRoomModel: Model<ClassRoomDocument>,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}
  async createClass(input: WithCurrentUserId<CreateClassInput>) {
    const { currentUserId, payload } = input;

    const classroom = new this.classRoomModel({
      name: payload.name,
      description: payload.description,
      coach: currentUserId,
    });

    return await classroom.save();
  }
}
