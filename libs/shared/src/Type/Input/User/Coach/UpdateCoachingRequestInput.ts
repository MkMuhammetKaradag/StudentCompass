import { CoachingRequestStatus } from '@app/shared/schemas/coachingRequest.schema';
import { InputType, Field } from '@nestjs/graphql';
import {

  IsEnum,
  IsMongoId,

} from 'class-validator';

@InputType()
export class UpdateCoachingRequestInput {
  @Field({ nullable: true })
  @IsMongoId()
  requestId: string;

  @Field(() => CoachingRequestStatus)
  @IsEnum(CoachingRequestStatus)
  status: CoachingRequestStatus;
}
