import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsMongoId, IsOptional, MinLength } from 'class-validator';

@InputType()
export class SendCoachingRequestInput {
  @Field({ nullable: true })
  @IsMongoId()
  coachingId: string;

  @Field()
  @IsOptional()
  message: string;
}
