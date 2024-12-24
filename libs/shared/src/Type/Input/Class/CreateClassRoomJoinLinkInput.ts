import { CoachingRequestStatus } from '@app/shared/schemas/coachingRequest.schema';
import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsMongoId, isNumber, IsOptional } from 'class-validator';

@InputType()
export class CreateClassRoomJoinLinkInput {
  @Field(() => Number, { defaultValue: 10 })
  duration: number;

  @Field()
  @IsMongoId()
  classRoomId: string;
}
