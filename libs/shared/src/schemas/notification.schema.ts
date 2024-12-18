import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

@Schema({ timestamps: true })
@ObjectType()
export class Notification {
  @Field(() => ID)
  _id: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
  })
  @Field(() => [ID])
  recipients: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  sender: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  message: string;

  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.INFO,
    required: true,
  })
  @Field(() => NotificationType)
  type: NotificationType;

  @Prop({ type: Boolean, default: false })
  @Field()
  isRead: boolean;

  @Prop({ type: Date, default: Date.now })
  @Field()
  createdAt: Date;

  @Prop({ type: Date, default: null })
  @Field({ nullable: true })
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Apply TTL setting to scheme
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });
