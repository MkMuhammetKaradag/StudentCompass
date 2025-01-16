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
  CurrentUser,
  NotificationCommands,
  NotificationDocument,
  NotificationType,
  PUB_SUB,
  UserRole,
  WithCurrentUser,
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

    this.chatEmitEvent(ChatCommands.ADD_PARTICIPANT_CHAT_CLASSROOM, {
      classRoomId: classRoom._id,
      currentUserId: currentUserId,
      isAdmin: joinLink.type === ClassRoomJoinLinkType.COACH,
    });

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
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Sınıfı getir ve kullanıcı türünü belirle
    const classRoom = await this.classRoomModel.findOne({
      _id: new Types.ObjectId(classRoomId),
      $or: [
        { students: { $in: [currentUserObjectId] } },
        { coachs: { $in: [currentUserObjectId] } },
      ],
    });

    if (!classRoom) {
      this.handleError('ClassRoom not found', HttpStatus.NOT_FOUND);
    }

    // Kullanıcının bir koç olup olmadığını kontrol et
    const isCoach = classRoom.coachs.some((coachId) =>
      coachId.equals(currentUserObjectId),
    );

    if (isCoach) {
      // Minimum iki koç kontrolü
      if (classRoom.coachs.length <= 1) {
        this.handleError(
          'At least one coach must remain in the class',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Koç listesinde kullanıcıyı kaldır
      classRoom.coachs = classRoom.coachs.filter(
        (coachId) => !coachId.equals(currentUserObjectId),
      );
    } else {
      // Öğrenci listesinde kullanıcıyı kaldır
      classRoom.students = classRoom.students.filter(
        (studentId) => !studentId.equals(currentUserObjectId),
      );
    }

    await classRoom.save();

    // Sohbet etkinliğini tetikle
    this.chatEmitEvent(ChatCommands.LEAVE_PARTICIPANT_CHAT_CLASSROOM, {
      classRoomId: classRoom._id,
      currentUserId: currentUserId,
      isAdmin: isCoach,
    });

    return `${isCoach ? 'Coach' : 'Student'} left the classRoom successfully`;
  }

  async freezeClassRoom(
    input: WithCurrentUser<{
      classRoomId: string;
    }>,
  ) {
    const classRoom = await this.classRoomModel.findOne({
      _id: new Types.ObjectId(input.payload.classRoomId),
      coachs: {
        $in: [new Types.ObjectId(input.currentUser._id)],
      },
      isDeleted: false,
    });
    if (!classRoom) {
      this.handleError('ClassRoom not found', HttpStatus.NOT_FOUND);
    }
    // ClassRoom silme işlemini gerçekleştirmek için
    classRoom.isDeleted = true;
    classRoom.deletedAt = new Date();
    await classRoom.save();

    this.chatEmitEvent(ChatCommands.FREEZE_CHAT, {
      currentUser: input.currentUser,
      payload: {
        classRoomId: classRoom._id,
      },
    });
    return 'deleted Class';
  }

  async unfreezeClassRoom(
    input: WithCurrentUser<{
      classRoomId: string;
    }>,
  ) {
    const classRoom = await this.classRoomModel.findOne({
      _id: new Types.ObjectId(input.payload.classRoomId),
      coachs: {
        $in: [new Types.ObjectId(input.currentUser._id)],
      },
      isDeleted: true,
    });
    if (!classRoom) {
      this.handleError('ClassRoom not found', HttpStatus.NOT_FOUND);
    }
    // ClassRoom silme işlemini gerçekleştirmek için
    classRoom.isDeleted = false;
    classRoom.deletedAt = null;
    await classRoom.save();

    this.chatEmitEvent(ChatCommands.UNFREEZE_CHAT, {
      currentUser: input.currentUser,
      payload: {
        classRoomId: classRoom._id,
      },
    });
    return 'unFreeze Class';
  }
}
