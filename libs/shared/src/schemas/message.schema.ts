import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Chat } from './chat.schema';
import { MediaContent } from './mediaContent.schema';

export type MessageDocument = Message & Document;
export enum MessageType {
  TEXT = 'TEXT',
  MEDIA = 'MEDIA',
}

registerEnumType(MessageType, {
  name: 'MessageType',
  description: 'Mesaj içerik tipleri',
});

@Schema({ timestamps: true })
@ObjectType()
export class Message {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  @Field(() => Chat)
  chat: Types.ObjectId;

  @Prop({ type: String, enum: MessageType, required: true })
  @Field(() => MessageType)
  type: MessageType;

  @Prop({ required: false })
  @Field({ nullable: true })
  content?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'MediaContent',
    required: function () {
      return this.type === MessageType.MEDIA;
    },
  })
  @Field(() => MediaContent, { nullable: true })
  media?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  @Field(() => [User])
  isRead: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  @Field(() => [User])
  hiddenBy: Types.ObjectId[];

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true })
  deletedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
