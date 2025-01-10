import {
  ChatCommands,
  ChatType,
  ClassRoom,
  ClassRoomDocument,
  ClassRoomJoinLink,
  ClassRoomJoinLinkDocument,
  ClassRoomJoinLinkType,
  CreateClassInput,
  CreateClassRoomJoinLinkInput,
  NotificationCommands,
  NotificationDocument,
  NotificationType,
  PUB_SUB,
  UserRole,
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
    @Inject('CHAT_SERVICE')
    private readonly chatServiceClient: ClientProxy,
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
  private chatEmitEvent(cmd: string, payload: any) {
    this.chatServiceClient.emit(cmd, payload);
  }
  async getClassRoom(input: WithCurrentUserId<{ classRoomId: string }>) {
    const {
      currentUserId,
      payload: { classRoomId },
    } = input;
    const currentUserObjetId = new Types.ObjectId(currentUserId);

    const classRoom = await this.classRoomModel.findById(classRoomId);
    if (!classRoom) {
      this.handleError('ClassRoom not found', HttpStatus.NOT_FOUND);
    }

    const isStudent = classRoom.students.includes(currentUserObjetId);
    const isCoach = classRoom.coachs.includes(currentUserObjetId);
    if (!isStudent && !isCoach) {
      this.handleError(
        'You are not a student or coach in this class',
        HttpStatus.FORBIDDEN,
      );
    }

    return classRoom;
  }

  async createClass(input: WithCurrentUserId<CreateClassInput>) {
    const { currentUserId, payload } = input;

    const classroom = new this.classRoomModel({
      name: payload.name,
      description: payload.description,
      coachs: new Types.ObjectId(currentUserId),
    });

    this.chatEmitEvent(ChatCommands.CREATE_CHAT_CLASSROOM, {
      chatName: payload.name,
      classRoomId: classroom._id,
      adminId: currentUserId,
      type: ChatType.CLASSROOM,
    });

    return await classroom.save();
  }

  async createJoinLink(input: WithCurrentUserId<CreateClassRoomJoinLinkInput>) {
    const {
      currentUserId,
      payload: { classRoomId, duration, type },
    } = input;
    const currentUserIdObjetId = new Types.ObjectId(currentUserId);
    const classRoom = await this.classRoomModel.findById(classRoomId);
    if (!classRoom) {
      this.handleError('ClassRoom not found', HttpStatus.NOT_FOUND);
    }
    if (!classRoom.coachs.includes(new Types.ObjectId(currentUserId))) {
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
      type,
    });

    return joinLink.save();
  }

  async joinClassRoom(
    input: WithCurrentUserId<{
      token: string;
      userRoles: UserRole[];
    }>,
  ) {
    const {
      currentUserId,
      payload: { token, userRoles },
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

    const isStudent = classRoom.students.includes(currentUserObjetId);
    const isCoach = classRoom.coachs.includes(currentUserObjetId);

    if (
      joinLink.type === ClassRoomJoinLinkType.STUDENT &&
      userRoles.includes(UserRole.STUDENT)
    ) {
      if (isCoach) {
        this.handleError(
          'User is already a coach in this class and cannot join as a student',
          HttpStatus.FORBIDDEN,
        );
      }

      if (!isStudent) {
        classRoom.students.push(currentUserObjetId);

        // Bildirim gönder
        this.notificationEmitEvent(NotificationCommands.SEND_NOTIFICATION, {
          senderId: currentUserId,
          recipientIds: classRoom.coachs.map((coachId) => coachId.toString()),
          message: `${currentUserId}, ${classRoom.name} sınıfına öğrenci olarak katıldı. Katılım tarihi: ${new Date(Date.now()).toLocaleString('en-US')}.`,
          notificationType: NotificationType.INFO,
        });
      }
    } else if (
      joinLink.type === ClassRoomJoinLinkType.COACH &&
      userRoles.includes(UserRole.COACH)
    ) {
      if (isStudent) {
        this.handleError(
          'User is already a student in this class and cannot join as a coach',
          HttpStatus.FORBIDDEN,
        );
      }

      if (!isCoach) {
        classRoom.coachs.push(currentUserObjetId);

        // Bildirim gönder
        this.notificationEmitEvent(NotificationCommands.SEND_NOTIFICATION, {
          senderId: currentUserId,
          recipientIds: classRoom.students.map((studentId) =>
            studentId.toString(),
          ),
          message: `${currentUserId}, ${classRoom.name} sınıfına koç olarak katıldı. Katılım tarihi: ${new Date(Date.now()).toLocaleString('en-US')}.`,
          notificationType: NotificationType.INFO,
        });
      }
    } else {
      this.handleError('Invalid join link type', HttpStatus.BAD_REQUEST);
    }

    // Değişiklikleri kaydet
    await classRoom.save();

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
