import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';
import { ClassRoom } from './classRoom.schema';

import { Assignment, AssignmentStatus } from './assignment.schema';
import { User } from './user.schema';
@Schema({ timestamps: true })
@ObjectType()
export class AssignmentSubmission {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field(() => Assignment)
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true })
  assignment: Types.ObjectId;

  @Field(() => User)
  @Prop({ type: String })
  student: string;

  // @Field(() => ClassRoom, { nullable: true })
  // @Prop({ type: Types.ObjectId, ref: 'ClassRoom', required: false })
  // classRoom?: Types.ObjectId;

  @Field(() => String)
  @Prop({ type: String, required: true })
  content: string;

  @Field(() => [String])
  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Field(() => String, { nullable: true })
  @Prop({ type: String })
  feedback?: string;

  @Field(() => Number, { nullable: true })
  @Prop({ type: Number, min: 0, max: 100 })
  grade?: number;

  @Field(() => Boolean)
  @Prop({ type: Boolean, default: false })
  isLate: boolean;

  @Field(() => AssignmentStatus)
  @Prop({
    type: String,
    enum: AssignmentStatus,
    default: AssignmentStatus.PENDING,
  })
  status: AssignmentStatus;

  @Field(() => Date)
  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Field(() => Date, { nullable: true })
  @Prop({ type: Date })
  gradedAt?: Date;

  @Field(() => User, { nullable: true })
  @Prop({ type: String })
  gradedBy?: string;
}
export type AssignmentSubmissionDocument = AssignmentSubmission & Document;
export const AssignmentSubmissionSchema =
  SchemaFactory.createForClass(AssignmentSubmission);
