import { ClassRoomJoinLinkType } from '@app/shared/schemas/classRoomJoinLink.schema';
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

  @Field(() => ClassRoomJoinLinkType, { nullable: true })
  @IsOptional()
  @IsEnum(ClassRoomJoinLinkType)
  type?: ClassRoomJoinLinkType;
}
