import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';
import { ClassRoom } from './classRoom.schema';
import { Student } from './student.schema';
import { Coach } from './coach.schema';

export enum AssignmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  OVERDUE = 'overdue',
}

export enum AssignmentType {
  CLASS = 'class',
  INDIVIDUAL= 'individual',
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

registerEnumType(AssignmentType, {
  name: 'AssignmentType',
  description: 'Assignment Type',
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

  @Field(() => AssignmentType)
  @Prop({
    type: String,
    enum: AssignmentType,
    required: true,
  })
  assignmentType: AssignmentType;

  @Field(() => ClassRoom, { nullable: true })
  @Prop({
    type: Types.ObjectId,
    ref: 'ClassRoom',
    required: function () {
      return this.assignmentType === AssignmentType.CLASS;
    },
  })
  classRoom?: Types.ObjectId;

  @Prop({
    type: [String],
    required: function () {
      return this.assignmentType === AssignmentType.INDIVIDUAL;
    },
  })
  @Field(() => [Student], { nullable: true })
  students?: string[]; // Ödevin atanacağı öğrenciler (opsiyonel)

  @Field(() => Coach)
  @Prop({ type: String, required: true })
  coach: string; // Görev/Ödevi oluşturan koç (isteğe bağlı)

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
  priority: AssignmentPriority;

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


  @Field(() => Number, { nullable: true })
  timeBeforeDueDate?: number; // Teslim tarihine kalan süre (dinamik alan)

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  attachments?: string[];
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
