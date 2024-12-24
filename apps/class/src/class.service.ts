import {
  ClassRoom,
  ClassRoomDocument,
  ClassRoomJoinLink,
  ClassRoomJoinLinkDocument,
  CreateClassInput,
  CreateClassRoomJoinLinkInput,
  NotificationDocument,
  PUB_SUB,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { RpcException } from '@nestjs/microservices';
@Injectable()
export class ClassService {
  constructor(
    @InjectModel(ClassRoom.name, 'classRoome')
    private readonly classRoomModel: Model<ClassRoomDocument>,
    @InjectModel(ClassRoomJoinLink.name, 'classRoome')
    private readonly classRoomJoinLinkModel: Model<ClassRoomJoinLinkDocument>,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new RpcException(
      error
        ? error
        : {
            message,
            statusCode,
          },
    );
  }
  async createClass(input: WithCurrentUserId<CreateClassInput>) {
    const { currentUserId, payload } = input;

    const classroom = new this.classRoomModel({
      name: payload.name,
      description: payload.description,
      coach: currentUserId,
    });

    return await classroom.save();
  }

  async createJoinLink(
    input: WithCurrentUserId<CreateClassRoomJoinLinkInput>,
    // currentUserId: string,
    // classRoomId: string,
    // duration: number,
  ) {
    // Sınıfın var olup olmadığını kontrol et
    const {
      currentUserId,
      payload: { classRoomId, duration },
    } = input;
    const classRoom = await this.classRoomModel.findById(classRoomId);
    if (!classRoom) {
      this.handleError('ClassRoom not found', HttpStatus.NOT_FOUND);
    }
    if (classRoom.coach !== currentUserId) {
      this.handleError(
        'You are not the coach of this class',
        HttpStatus.FORBIDDEN,
      );
    }
    // Benzersiz bir token oluştur
    const token = crypto.randomBytes(20).toString('hex');

    // Katılma linki oluştur ve kaydet
    const joinLink = new this.classRoomJoinLinkModel({
      classRoom: new Types.ObjectId(classRoomId),
      token,
      expiresAt: new Date(Date.now() + duration * 60 * 1000), // Süreyi dk olarak belirle
    });

    return joinLink.save();
  }
}
