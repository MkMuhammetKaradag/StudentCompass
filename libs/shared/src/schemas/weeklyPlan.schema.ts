import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ObjectType, ID } from '@nestjs/graphql';
import { Task } from './task.schema';

export type WeeklyPlanDocument = WeeklyPlan & Document;

@Schema({ timestamps: true })
@ObjectType()
export class WeeklyPlan {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  @Field(() => ID, { nullable: true })
  student?: Types.ObjectId; // Plan bir öğrenciye aitse

  @Prop({ type: Types.ObjectId, ref: 'ClassRoom', required: false })
  @Field(() => ID, { nullable: true })
  classRoom?: Types.ObjectId; // Plan bir sınıfa aitse

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => ID)
  coach: Types.ObjectId; // Haftalık planı oluşturan koç

  @Prop({ type: [Types.ObjectId], ref: 'Task', default: [] })
  @Field(() => [Task])
  tasks: Types.ObjectId[]; // Haftalık plana bağlı görevler

  @Prop({ required: true, default: false })
  @Field()
  repeat: boolean; // Plan tekrar ediyor mu?

  @Prop({ type: Date, default: null })
  @Field({ nullable: true })
  repeatUntil: string; // Plan tekrar ediyorsa bitiş tarihi
}

export const WeeklyPlanSchema = SchemaFactory.createForClass(WeeklyPlan);
