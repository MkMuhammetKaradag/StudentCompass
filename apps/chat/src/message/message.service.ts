import {
  Chat,
  ChatDocument,
  GetChatMessagesInput,
  MediaContent,
  MediaContentDocument,
  Message,
  MessageDocument,
  NotificationCommands,
  NotificationType,
  PUB_SUB,
  SendMessageInput,
  User,
  UserDocument,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, Payload, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Chat.name, 'chat')
    private readonly chatModel: Model<ChatDocument>,
    @InjectModel(User.name, 'chat')
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Message.name, 'chat')
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(MediaContent.name, 'chat')
    private readonly mediaContentModel: Model<MediaContentDocument>,

    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,

    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationServiceClient: ClientProxy,
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

  async sendMessage(input: WithCurrentUserId<SendMessageInput>) {
    const { currentUserId, payload } = input;
    const [chat, user] = await Promise.all([
      this.chatModel
        .findOne({
          _id: payload.chatId,
          participants: { $in: new Types.ObjectId(currentUserId) },
        })
        .populate({
          path: 'participants',
          select: '_id status ',
          model: 'User',
        }),
      this.userModel.findById(currentUserId),
    ]);
    if (!chat || !user) {
      return this.handleError('Chat or user not found', HttpStatus.NOT_FOUND);
    }

    let media: MediaContent | undefined;
    if (payload.mediaContent) {
      const newMedia = new this.mediaContentModel({
        type: payload.mediaContent.type,
        url: payload.mediaContent.url,
        thumbnail: payload.mediaContent.thumbnail,
        duration: payload.mediaContent.duration,
        size: payload.mediaContent.size,
        mimeType: payload.mediaContent.mimeType,
      });
      const savedMedia = await newMedia.save();
      media = savedMedia;
    }

    const newMessage = new this.messageModel({
      sender: new Types.ObjectId(currentUserId),
      chat: new Types.ObjectId(payload.chatId),
      type: payload.type,
      content: payload.content,
      media: media ? media._id : null,
      isRead: [new Types.ObjectId(currentUserId)],
    });

    await newMessage.save();

    await this.chatModel.findByIdAndUpdate(chat._id, {
      $push: { messages: newMessage._id },
    });

    const messageForPublish = {
      _id: newMessage._id,
      type: newMessage.type,
      content: newMessage.content,
      chatId: chat._id,
      sender: {
        _id: user._id,
        userName: user.userName,
        profilePhoto: user.profilePhoto,
      },
    };
    if (media) {
      Object.assign(messageForPublish, { media: media });
    }

    this.pubSub.publish('sendMessageToChat', {
      sendMessageToChat: messageForPublish,
    });
    const participants = chat.participants as unknown as User[];
    const notificationInput = {
      senderId: user._id,
      recipientIds: participants
        .filter(
          (participant) =>
            participant._id.toString() !== currentUserId.toString() &&
            participant.status !== false,
        )
        .map((participant) => participant._id),
      message: `${user.userName}  adlı kullanıcı ${chat.chatName} kanalına   messaj gonderdi`,

      notificationType: NotificationType.INFO,
    };

    this.notificationEmitEvent(
      NotificationCommands.SEND_NOTIFICATION,
      notificationInput,
    );

    return newMessage;
  }

  private notificationEmitEvent(cmd: string, payload: any) {
    this.notificationServiceClient.emit(cmd, payload);
  }

  async getChatMessages(input: WithCurrentUserId<GetChatMessagesInput>) {
    const {
      currentUserId,
      payload: { chatId, page, limit, extraPassValue },
    } = input;

    const chat = await this.chatModel.findById(chatId).populate('participants');
    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }

    const isParticipant = chat.participants.some((participant: any) =>
      participant._id.equals(currentUserId),
    );

    if (!isParticipant) {
      this.handleError(
        'You are not authorized to view this chat',
        HttpStatus.FORBIDDEN,
      );
    }

    const skip = (page - 1) * limit + extraPassValue;

    const chatMessages = await this.messageModel.aggregate([
      {
        $match: {
          chat: new Types.ObjectId(chatId),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender',
        },
      },
      {
        $unwind: {
          path: '$sender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'mediacontents',
          localField: 'media',
          foreignField: '_id',
          as: 'media',
        },
      },
      {
        $unwind: {
          path: '$media',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Check if userId exists in the isRead array
        $addFields: {
          messageIsReaded: {
            $cond: {
              if: { $in: [new Types.ObjectId(currentUserId), '$isRead'] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          type: 1,
          'sender.userName': 1,
          'sender.profilePhoto': 1,
          'sender._id': 1,
          'media.type': 1,
          'media.url': 1,
          'media._id': 1,
          messageIsReaded: 1,
        },
      },
    ]);

    const totalMessages = await this.messageModel.countDocuments({
      chat: new Types.ObjectId(chatId),
    });
    const pagination = {
      messages: chatMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    };

    return pagination;
  }
}
