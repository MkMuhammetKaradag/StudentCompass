import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Message } from './message.schema';

export type ChatDocument = Chat & Document;

export enum ChatType {
  DIRECT = 'direct',
  CLASSROOM = 'classRoom',
}
registerEnumType(ChatType, {
  name: 'ChatType',
  description: 'Chat  Type',
});

export interface IChatMetadata {
  createdAt: Date;
  lastActivity: Date;
  participantCount: number;
  type: ChatType;
}
@Schema({ _id: false })
@ObjectType()
export class ChatMetadata {
  @Prop()
  @Field()
  createdAt: Date;

  @Prop()
  @Field()
  lastActivity: Date;

  @Prop()
  @Field()
  participantCount: number;

  @Prop({ type: String, enum: ChatType })
  @Field(() => ChatType)
  type: ChatType;
}

@Schema({ timestamps: true })
@ObjectType()
export class Chat {
  @Field(() => ID)
  _id: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User])
  participants: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User])
  admins: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  @Field(() => [Message])
  messages: Types.ObjectId[];

  @Prop({ type: String })
  @Field(() => String, { nullable: true })
  chatName?: string;

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ required: true, enum: ChatType })
  @Field(() => ChatType)
  type: ChatType;

  //   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  //   @Field(() => User)
  //   createdByUser: Types.ObjectId;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true })
  deletedAt?: Date;

  //   @Prop({ type: Object })
  //   @Field(() => ChatMetadata)
  //   metadata: IChatMetadata;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
