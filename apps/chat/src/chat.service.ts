import {
  Chat,
  ChatDocument,
  ChatType,
  CreateChatInput,
  MessageType,
  User,
  UserDocument,
  UserRole,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name, 'chat')
    private readonly chatModel: Model<ChatDocument>,

    @InjectModel(User.name, 'chat')
    private readonly userModel: Model<UserDocument>,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new RpcException({
      message,
      statusCode: statusCode,
      error: error,
    });
  }

  async createChatClassRoom(input: {
    chatName: string;
    classRoomId: string;
    adminId: string;
    type: ChatType;
  }) {
    try {
      const chat = new this.chatModel({
        type: input.type,
        classRoomId: input.classRoomId,
        admins: new Types.ObjectId(input.adminId),
        chatName: input.chatName,
      });

      await chat.save();
    } catch (error) {
      this.handleError('any erro', HttpStatus.BAD_GATEWAY, error);
    }
  }
  private async validateChatCreation(
    currentUserId: string,
    participants: string[],
  ): Promise<void> {
    // Katılımcı sayısı kontrolü
    if (!participants || participants.length === 0) {
      this.handleError(
        'At least one participant is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (participants.length > 50) {
      this.handleError(
        'Maximum number of participants exceeded',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Geçerli kullanıcı ID'leri kontrolü
    if (!Types.ObjectId.isValid(currentUserId)) {
      this.handleError('Invalid user ID', HttpStatus.BAD_REQUEST);
    }

    // Kullanıcıların varlığını kontrol et
    const users = await this.userModel.find({
      _id: { $in: [...participants, currentUserId] },
    });
    const uniqueParticipants = [...new Set([...participants, currentUserId])];
    if (users.length !== uniqueParticipants.length) {
      this.handleError('Some users were not found', HttpStatus.BAD_REQUEST);
    }
  }

  private async findExistingChat(
    participants: Types.ObjectId[],
  ): Promise<ChatDocument | null> {
    return await this.chatModel.findOne({
      participants: {
        $all: participants,
        $size: participants.length,
      },
    });
  }

  async createChat(input: WithCurrentUserId<CreateChatInput>) {
    const { currentUserId, payload } = input;

    await this.validateChatCreation(currentUserId, payload.participants);

    const uniqueParticipantsObjectId = [
      ...new Set([...payload.participants, currentUserId]),
    ].map((id) => new Types.ObjectId(id));

    const existingChat = await this.findExistingChat(
      uniqueParticipantsObjectId,
    );

    if (existingChat) {
      // Eğer sohbet silinmişse, aktif hale getir
      if (existingChat.isDeleted) {
        existingChat.isDeleted = false;
        existingChat.deletedAt = null;
        existingChat.chatName = payload.chatName;
        await existingChat.save();
      }
      return existingChat;
    }

    const chatType =
      uniqueParticipantsObjectId.length <= 2 ? ChatType.DIRECT : ChatType.GROUP;

    const chat = new this.chatModel({
      chatName: payload.chatName,
      admins:
        chatType == ChatType.DIRECT
          ? uniqueParticipantsObjectId
          : [new Types.ObjectId(currentUserId)],
      // createdByUser: new Types.ObjectId(currentUserId),
      participants: uniqueParticipantsObjectId,
      type: chatType,
    });
    return await chat.save();
  }

  async getMyChats(currentUserId: string) {
    const chats = await this.chatModel.aggregate([
      {
        $match: {
          participants: new Types.ObjectId(currentUserId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participants',
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { userId: new Types.ObjectId(currentUserId) },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$userId'] },
              },
            },
            {
              $project: {
                roles: 1,
              },
            },
          ],
          as: 'currentUser',
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'messages',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                type: MessageType.TEXT,
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'sender',
                foreignField: '_id',
                as: 'sender',
              },
            },
            { $unwind: '$sender' },
            {
              $project: {
                content: 1,
                createdAt: 1,
                'mediaContent.url': 1,
                'sender._id': 1,
              },
            },
          ],
          as: 'lastMessage',
        },
      },
      {
        $project: {
          chatName: 1,
          admins: 1, // admins alanını koruyoruz
          participants: {
            $filter: {
              input: '$participants',
              as: 'participant',
              cond: {
                $ne: ['$$participant._id', new Types.ObjectId(currentUserId)],
              },
            },
          },
          lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
          isAdmin: {
            $or: [
              { $in: [new Types.ObjectId(currentUserId), '$admins'] },
              {
                $in: [
                  UserRole.ADMIN,
                  {
                    $ifNull: [{ $arrayElemAt: ['$currentUser.roles', 0] }, []],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          chatName: 1,
          'participants._id': 1,
          'participants.status': 1,
          'participants.userName': 1,
          'participants.profilePhoto': 1,
          lastMessage: 1,
          isAdmin: 1,
        },
      },
    ]);

    return chats;
  }
}
