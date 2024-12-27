import {
  ClassRoom,
  ClassRoomDocument,
  ClassRoomJoinLink,
  ClassRoomJoinLinkDocument,
  CreateClassInput,
  CreateClassRoomJoinLinkInput,
  NotificationCommands,
  NotificationDocument,
  NotificationType,
  PUB_SUB,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
@Injectable()
export class ClassService {
  constructor(
    @InjectModel(ClassRoom.name, 'classRoome')
    private readonly classRoomModel: Model<ClassRoomDocument>,
    @InjectModel(ClassRoomJoinLink.name, 'classRoome')
    private readonly classRoomJoinLinkModel: Model<ClassRoomJoinLinkDocument>,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationServiceClient: ClientProxy,
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

  private notificationEmitEvent(cmd: string, payload: any) {
    this.notificationServiceClient.emit(cmd, payload);
  }
  async createClass(input: WithCurrentUserId<CreateClassInput>) {
    const { currentUserId, payload } = input;

    const classroom = new this.classRoomModel({
      name: payload.name,
      description: payload.description,
      coach: new Types.ObjectId(currentUserId),
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
    const currentUserIdObjetId = new Types.ObjectId(currentUserId);
    const classRoom = await this.classRoomModel.findById(classRoomId);
    if (!classRoom) {
      this.handleError('ClassRoom not found', HttpStatus.NOT_FOUND);
    }
    if (classRoom.coach.toString() !== currentUserId) {
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

  async joinClassRoom(
    input: WithCurrentUserId<{
      token: string;
    }>,
  ) {
    const {
      currentUserId,
      payload: { token },
    } = input;
    const currentUserObjetId = new Types.ObjectId(currentUserId);

    const joinLink = await this.classRoomJoinLinkModel.findOne({ token });
    if (!joinLink || joinLink.expiresAt < new Date()) {
      this.handleError('Invalid or expired join link', HttpStatus.BAD_REQUEST);
    }

    // Sınıfı güncelle
    const classRoom = await this.classRoomModel.findById(joinLink.classRoom);
    if (!classRoom) {
      this.handleError('ClassRoome not Found', HttpStatus.NOT_FOUND);
    }

    if (!classRoom.students.includes(currentUserObjetId)) {
      classRoom.students.push(currentUserObjetId);

      this.notificationEmitEvent(NotificationCommands.SEND_NOTIFICATION, {
        senderId: currentUserId,
        recipientIds: [classRoom.coach],
        message: `${currentUserId}, ${classRoom.name} sınıfına katıldı. Katılım tarihi: ${new Date(Date.now()).toLocaleString('en-US')}.`,
        notificationType: NotificationType.INFO,
      });

      await classRoom.save();
    }

    return classRoom;
  }

  async leaveClassRoom(
    input: WithCurrentUserId<{
      classRoomId: string;
    }>,
  ) {
    const {
      currentUserId,
      payload: { classRoomId },
    } = input;
    const currentUserObjetId = new Types.ObjectId(currentUserId);
    // Sınıfı güncelle
    const classRoom = await this.classRoomModel.findOne({
      _id: classRoomId,
      students: { $in: [currentUserObjetId] },
    });
    if (!classRoom) {
      this.handleError('ClassRoome not Found', HttpStatus.NOT_FOUND);
    }

    classRoom.students = classRoom.students.filter(
      (studentId) => studentId.toString() !== currentUserId,
    );
    await classRoom.save();
    return 'Leave ClassRoome';
  }
}
