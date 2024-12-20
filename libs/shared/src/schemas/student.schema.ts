import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { User } from './user.schema';
import { Types } from 'mongoose';

@Schema()
@ObjectType()
export class Student extends User {
  @Prop({ nullable: true })
  @Field(() => String, { nullable: true })
  academicLevel?: string;

  @Prop({ type: [String], nullable: true  })
  @Field(() => [String], { nullable: true })
  interests?: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', nullable: true })
  @Field(() => User, { nullable: true })
  coach?: Types.ObjectId;
}
export type StudentDocument = Student & Document;
export const StudentSchema = SchemaFactory.createForClass(Student);
