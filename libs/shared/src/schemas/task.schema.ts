import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
}
registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: 'Task Status',
});

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Task {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WeeklyPlan', required: true })
  @Field(() => ID)
  weeklyPlan: Types.ObjectId; // Görevin bağlı olduğu haftalık plan

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  @Field(() => ID, { nullable: true })
  student?: Types.ObjectId; // Plan bir öğrenciye aitse

  @Prop({ type: Types.ObjectId, ref: 'ClassRoom', required: false })
  @Field(() => ID, { nullable: true })
  classRoom?: Types.ObjectId; // Plan bir sınıfa aitse

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => ID)
  coach: Types.ObjectId; // Görevi oluşturan koç

  @Prop({ required: true })
  @Field()
  day: string; // Haftanın günü (örneğin: "Monday")

  @Prop({ required: true })
  @Field()
  startTime: string; // Görev başlangıç saati (örneğin: "13:00")

  @Prop({ required: true })
  @Field()
  endTime: string; // Görev bitiş saati (örneğin: "15:00")

  @Prop({ required: true })
  @Field()
  taskType: string; // Görev türü (örneğin: "Matematik Sorusu")

  @Prop({ required: true })
  @Field()
  description: string; // Görevin detay açıklaması

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.TODO })
  @Field(() => TaskStatus)
  status: TaskStatus;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
