import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type CoachingRequestDocument = CoachingRequest & Document;

export enum CoachingRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELD = 'canceld',
}

registerEnumType(CoachingRequestStatus, {
  name: 'CoachingRequestStatus',
  description: 'Status of the coaching request',
});

@Schema({ timestamps: true })
@ObjectType()
export class CoachingRequest {
  @Field(() => ID)
  _id: string;

  // Koçluk isteğini gönderen öğrenci
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  student: Types.ObjectId;

  // Koçluk isteğini alacak koç
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  coach: Types.ObjectId;

  // İsteğin durumu: pending, accepted, rejected
  @Prop({ enum: CoachingRequestStatus, default: CoachingRequestStatus.PENDING })
  @Field(() => CoachingRequestStatus)
  status: CoachingRequestStatus;

  // Ek bir mesaj veya açıklama alanı
  @Prop({ default: '' })
  @Field({ nullable: true })
  message?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const CoachingRequestSchema =
  SchemaFactory.createForClass(CoachingRequest);
