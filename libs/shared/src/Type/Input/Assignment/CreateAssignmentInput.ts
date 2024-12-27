import { InputType, Field } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsArray,
  IsMongoId,
} from 'class-validator';
import {
  AssignmentStatus,
  AssignmentType,
  AssignmentPriority,
  AssignmentVisibility,
} from '../../../schemas/assignment.schema';

@InputType()
export class CreateAssignmentInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  title: string; // Görev/Ödev başlığı

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string; // Görev/Ödev açıklaması (opsiyonel)

  @Field(() => Date)
  @IsDate()
  dueDate: Date; // Son teslim tarihi

  @Field(() => AssignmentType)
  @IsEnum(AssignmentType)
  assignmentType: AssignmentType; // Görev türü

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  classRoom?: string; // Sınıf bilgisi (opsiyonel)

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  students?: string[]; // Öğrenciler (opsiyonel)


  @Field(() => AssignmentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus; // Görev durumu (opsiyonel)

  @Field(() => AssignmentPriority, { nullable: true })
  @IsOptional()
  @IsEnum(AssignmentPriority)
  priority?: AssignmentPriority; // Görev önceliği (opsiyonel)

  @Field(() => AssignmentVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(AssignmentVisibility)
  visibility?: AssignmentVisibility; // Görünürlük (opsiyonel)

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  tags?: string[]; // Etiketler (opsiyonel)

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  attachments?: string[]; // Ekler (opsiyonel)
}
