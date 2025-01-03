import { InputType, Field } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsArray,
  IsMongoId,
  Min,
  Max,
} from 'class-validator';
import {
  AssignmentStatus,
  AssignmentType,
  AssignmentPriority,
  AssignmentVisibility,
} from '../../../schemas/assignment.schema';

@InputType()
export class GradeAssignmentInput {
  @Field(() => String)
  @IsMongoId()
  submissionId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  feedback?: string;

  @Field(() => Number)
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  grade: number;
}
