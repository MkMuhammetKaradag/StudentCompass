import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ObjectType, ID } from '@nestjs/graphql';
import { Coach } from './coach.schema';
import { Student } from './student.schema';
import { Assignment } from './assignment.schema';

export type ClassRoomDocument = ClassRoom & Document;

@Schema({ timestamps: true })
@ObjectType()
export class ClassRoom {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  name: string; // Sınıf adı (örneğin Matematik, Türkçe)

  @Prop({ required: true })
  @Field()
  description: string;

  @Prop({ type: String, required: true })
  @Field(() => Coach)
  coach: string; // Sınıfı oluşturan koçun ID'si

  @Prop({ type: [String], default: [] })
  @Field(() => [Student])
  students: String[]; // Sınıfa kayıtlı öğrenciler

  @Prop({ type: [String], default: [] })
  @Field(() => [Assignment])
  assignments: String[]; // Sınıfa ait ödevler

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

export const ClassRoomSchema = SchemaFactory.createForClass(ClassRoom);
