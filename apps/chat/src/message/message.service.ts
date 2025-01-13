import {
  Chat,
  ChatDocument,
  MediaContent,
  MediaContentDocument,
  Message,
  MessageDocument,
  SendMessageInput,
  User,
  UserDocument,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Payload, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
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

    let mediaId: Types.ObjectId | undefined;
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
      mediaId = new Types.ObjectId(savedMedia._id);
    }

    const newMessage = new this.messageModel({
      sender: new Types.ObjectId(currentUserId),
      chat: new Types.ObjectId(payload.chatId),
      type: payload.type,
      content: payload.content,
      media: mediaId, 
      isRead: [new Types.ObjectId(currentUserId)],
    });

    await newMessage.save();

    await this.chatModel.findByIdAndUpdate(chat._id, {
      $push: { messages: newMessage._id },
    });

    return newMessage;
  }
}
