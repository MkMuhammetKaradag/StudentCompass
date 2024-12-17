import { CoachingRequestStatus } from '@app/shared/schemas/coachingRequest.schema';
import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';

@InputType()
export class GetCoachingRequestInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsMongoId()
  coachingId: string | null;

  @Field(() => CoachingRequestStatus)
  @IsEnum(CoachingRequestStatus)
  status: CoachingRequestStatus;
}
