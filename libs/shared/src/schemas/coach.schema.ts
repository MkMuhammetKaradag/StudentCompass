import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { User } from './user.schema';
import { Types } from 'mongoose';

@Schema()
@ObjectType()
export class Coach extends User {
  @Prop({ nullable: true })
  @Field({ nullable: true })
  expertise?: string;

  @Prop({ nullable: true  })
  @Field({ nullable: true })
  maxStudents?: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  @Field(() => [User], { nullable: true })
  coachedStudents?: Types.ObjectId[];
}

export type CoachDocument = Coach & Document;
export const CoachSchema = SchemaFactory.createForClass(Coach);
