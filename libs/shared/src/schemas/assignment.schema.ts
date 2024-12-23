import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';
import { ClassRoom } from './classRoom.schema';
import { Student } from './student.schema';
import { Coach } from './coach.schema';

export enum AssignmentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}
export enum AssignmentPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum AssignmentVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  TEAM = 'team',
}
registerEnumType(AssignmentStatus, {
  name: 'AssignmentStatus',
  description: 'Assignment Status',
});

registerEnumType(AssignmentPriority, {
  name: 'AssignmentPriority',
  description: 'Assignment Priority',
});

registerEnumType(AssignmentVisibility, {
  name: 'AssignmentVisibility',
  description: 'Assignment visibility',
});
@Schema({ timestamps: true }) // Timestamps ile createdAt ve updatedAt otomatik eklenir
@ObjectType()
export class Assignment {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field(() => String)
  @Prop({ type: String, required: true })
  title: string; // Görev/Ödev başlığı

  @Field(() => String, { nullable: true })
  @Prop({ type: String })
  description?: string; // Görev/Ödev açıklaması (isteğe bağlı)

  @Field(() => Date)
  @Prop({ type: Date, required: true })
  dueDate: Date; // Son teslim tarihi

  @Prop({ type: String, nullable: true })
  @Field(() => ClassRoom, { nullable: true })
  class?: string;

  @Prop({ type: [String], default: [] })
  @Field(() => [Student], { nullable: true })
  students?: string[]; // Ödevin atanacağı öğrenciler (opsiyonel)

  @Field(() => Coach, { nullable: true })
  @Prop({ type: String, required: false })
  coach?: string; // Görev/Ödevi oluşturan koç (isteğe bağlı)

  @Field(() => AssignmentStatus)
  @Prop({
    type: String,
    enum: AssignmentStatus,
    default: AssignmentStatus.PENDING,
  })
  status: AssignmentStatus; // Görev durumu

  @Field(() => AssignmentPriority, { nullable: true })
  @Prop({
    type: String,
    enum: AssignmentPriority,
    default: AssignmentPriority.LOW,
  })
  priority?: AssignmentPriority;

  @Field(() => AssignmentVisibility, { nullable: true })
  @Prop({
    type: String,
    enum: AssignmentVisibility,
    default: AssignmentVisibility.PRIVATE,
  })
  visibility?: AssignmentVisibility;

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  tags?: string[]; // Görev/Ödev etiketleri (isteğe bağlı)

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: null })
  feedback?: string; // Görev/Ödev geri bildirimi (koç tarafından)

  @Field(() => Number, { nullable: true })
  @Prop({ type: Number, default: null })
  grade?: number; // Görev/Ödev notu (isteğe bağlı)

  @Field(() => Date, { nullable: true })
  @Prop({ type: Date })
  completedAt?: Date; // Görev/Ödev tamamlanma tarihi

  @Field(() => Number, { nullable: true })
  timeBeforeDueDate?: number; // Teslim tarihine kalan süre (dinamik alan)
}

export type AssignmentDocument = Assignment & Document;

// Şema oluşturma
export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

// Virtual field: timeBeforeDueDate
AssignmentSchema.virtual('timeBeforeDueDate').get(function () {
  if (!this.dueDate) return null; // Eğer teslim tarihi yoksa null döner
  const now = new Date();
  return Math.max(
    0,
    (this.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  ); // Kalan gün sayısı
});
