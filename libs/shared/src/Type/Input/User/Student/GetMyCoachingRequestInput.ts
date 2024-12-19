import { CoachingRequestStatus } from '@app/shared/schemas/coachingRequest.schema';
import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsMongoId, IsOptional, MinLength } from 'class-validator';

@InputType()
export class GetMyCoachingRequestInput {
  @Field(() => CoachingRequestStatus, { nullable: true })
  status?: CoachingRequestStatus;
}
