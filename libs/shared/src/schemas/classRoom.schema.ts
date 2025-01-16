import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ObjectType, ID } from '@nestjs/graphql';

import { Assignment } from './assignment.schema';
import { User } from './user.schema';

export type ClassRoomDocument = ClassRoom & Document;

@Schema({ timestamps: true })
@ObjectType()
export class ClassRoom {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop({ required: true })
  @Field()
  description: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  @Field(() => User)
  coachs: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  @Field(() => [User])
  students: Types.ObjectId[]; // Sınıfa kayıtlı öğrenciler

  @Prop({ type: [String], default: [] })
  @Field(() => [Assignment])
  assignments: string[]; // Sınıfa ait ödevler

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true })
  deletedAt?: Date;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

export const ClassRoomSchema = SchemaFactory.createForClass(ClassRoom);
