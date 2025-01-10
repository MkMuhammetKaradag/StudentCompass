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
        participants: new Types.ObjectId(input.adminId),
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

  async leaveChat(
    input: WithCurrentUserId<{
      chatId: string;
    }>,
  ) {
    const {
      currentUserId,
      payload: { chatId },
    } = input;

    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Check if the user is a participant and admin of the chat
    const chat = await this.chatModel.findOne({
      _id: chatId,
      participants: { $in: [currentUserObjectId] },
    });

    if (!chat) {
      this.handleError(
        'You are not a participant of this chat',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isUserAdmin = chat.admins.some((adminId) =>
      adminId.equals(currentUserObjectId),
    );

    // Remove user from participants
    const updatedChat = await this.chatModel.findOneAndUpdate(
      { _id: chatId, participants: { $in: [currentUserObjectId] } },
      { $pull: { participants: currentUserObjectId } },
      { new: true },
    );

    if (!updatedChat) {
      this.handleError(
        'Failed to leave the chat',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // If the chat has no participants left, delete it
    if (updatedChat.participants.length === 0) {
      updatedChat.isDeleted = true;
      await updatedChat.save();
      // await this.chatModel.deleteOne({ _id: chatId });
      return 'Chat deleted because no participants left';
    }

    // If the user is an admin and no other admins exist, assign a new admin
    if (isUserAdmin) {
      const remainingAdmins = chat.admins.filter(
        (adminId) => !adminId.equals(currentUserObjectId),
      );

      if (remainingAdmins.length === 0) {
        // Select a new admin from remaining participants
        const newAdmin = updatedChat.participants[0]; // You can use a custom logic here
        updatedChat.admins = [newAdmin];
        await updatedChat.save();
      }
    }

    return 'User left chat';
  }

  async addParticipant(
    input: WithCurrentUserId<{
      chatId: string;
      userId: string;
    }>,
  ) {
    const {
      currentUserId,
      payload: { chatId, userId },
    } = input;
    const chat = await this.chatModel.findById(chatId);

    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }

    if (!chat.admins.some((adminId) => adminId.equals(currentUserId))) {
      this.handleError(
        'You are not the creator or an admin',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user is already an admin
    if (
      chat.participants.some((participantId) => participantId.equals(userId))
    ) {
      this.handleError('User is already an participant', HttpStatus.FORBIDDEN);
    }

    chat.participants.push(new Types.ObjectId(userId));
    return chat.save();
  }

  async removeParticipant(
    input: WithCurrentUserId<{
      chatId: string;
      userId: string;
    }>,
  ) {
    const {
      currentUserId,
      payload: { chatId, userId },
    } = input;
    const chat = await this.chatModel.findById(chatId);

    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }

    if (!chat.admins.some((adminId) => adminId.equals(currentUserId))) {
      this.handleError(
        'You are not the creator or an admin',
        HttpStatus.FORBIDDEN,
      );
    }

    // Cannot remove the creator from admins
    if (userId == currentUserId) {
      this.handleError('user cannot remove himself', HttpStatus.FORBIDDEN);
    }

    chat.admins = chat.admins.filter((adminId) => !adminId.equals(userId));
    chat.participants = chat.participants.filter(
      (participantId) => !participantId.equals(userId),
    );
    return chat.save();
  }
}
