import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Types } from 'mongoose';
export type CoachingSessionDocument = CoachingSession & Document;
@Schema({ timestamps: true })
@ObjectType()
export class CoachingSession {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  coach: Types.ObjectId; // Öğretmen

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  student: Types.ObjectId; // Öğrenci

  @Prop({ required: true })
  @Field()
  topic: string; // Görüşme konusu

  @Prop({ required: true })
  @Field()
  date: Date; // Görüşme tarihi

  @Prop({ type: String })
  @Field({ nullable: true })
  notes?: string; // Görüşme notları
}

export const CoachingSessionSchema =
  SchemaFactory.createForClass(CoachingSession);
