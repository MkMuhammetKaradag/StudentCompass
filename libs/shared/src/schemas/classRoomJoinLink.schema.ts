import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';
import { ClassRoom } from './classRoom.schema';

export type ClassRoomJoinLinkDocument = ClassRoomJoinLink & Document;
export enum ClassRoomJoinLinkType {
  COACH = 'coach',
  STUDENT = 'student',
}

registerEnumType(ClassRoomJoinLinkType, {
  name: 'ClassRoomJoinLinkType',
  description: 'ClassRoomJoinLink Type',
});
@Schema({ timestamps: true })
@ObjectType()
export class ClassRoomJoinLink {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({
    type: String,
    enum: ClassRoomJoinLinkType,
    default: ClassRoomJoinLinkType.STUDENT,
  })
  @Field(() => ClassRoomJoinLinkType)
  type: ClassRoomJoinLinkType;

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
