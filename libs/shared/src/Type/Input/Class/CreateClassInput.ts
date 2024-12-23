import { CoachingRequestStatus } from '@app/shared/schemas/coachingRequest.schema';
import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';

@InputType()
export class CreateClassInput {
  @Field()
  name: string;

  @Field()
  description: string;
}
