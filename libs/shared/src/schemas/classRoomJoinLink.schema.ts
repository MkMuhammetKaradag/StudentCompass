import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ObjectType, ID } from '@nestjs/graphql';
import { ClassRoom } from './classRoom.schema';

export type ClassRoomJoinLinkDocument = ClassRoomJoinLink & Document;

@Schema({ timestamps: true })
@ObjectType()
export class ClassRoomJoinLink {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'ClassRoom' })
  @Field(() => ClassRoom)
  classRoom: Types.ObjectId;

  @Prop({ required: true, unique: true })
  @Field()
  token: string; // Katılma bağlantısı için benzersiz bir token

  @Prop({ type: Date, default: Date.now })
  @Field()
  createdAt: Date;

  @Prop({ required: true, index: { expires: 0 } })
  @Field()
  expiresAt: Date; // Geçerlilik süresi
}

export const ClassRoomJoinLinkSchema =
  SchemaFactory.createForClass(ClassRoomJoinLink);
