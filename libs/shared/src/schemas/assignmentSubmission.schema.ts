import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';

import { Assignment } from './assignment.schema';
import { User } from './user.schema';

export enum AssignmentSubmissionStatus {
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  OVERDUE = 'overdue',
}
registerEnumType(AssignmentSubmissionStatus, {
  name: 'AssignmentSubmissionStatus',
  description: 'AssignmentSubmissionStatus  Status',
});

@Schema({ timestamps: true })
@ObjectType()
export class AssignmentSubmission {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field(() => Assignment)
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true })
  assignment: Types.ObjectId;

  @Field(() => User)
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  student: Types.ObjectId;

  @Field(() => String)
  @Prop({ type: String, required: true })
  description: string;

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

  @Field(() => AssignmentSubmissionStatus)
  @Prop({
    type: String,
    enum: AssignmentSubmissionStatus,
    default: AssignmentSubmissionStatus.SUBMITTED,
  })
  status: AssignmentSubmissionStatus;

  @Field(() => Date)
  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Field(() => Date, { nullable: true })
  @Prop({ type: Date })
  gradedAt?: Date;

  @Field(() => User, { nullable: true })
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  gradedBy?: Types.ObjectId;
}
export type AssignmentSubmissionDocument = AssignmentSubmission & Document;
export const AssignmentSubmissionSchema =
  SchemaFactory.createForClass(AssignmentSubmission);
