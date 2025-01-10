import { InputType, Field } from '@nestjs/graphql';
import { IsMongoId, IsNotEmpty } from 'class-validator';

@InputType()
export class AddParticipantInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsMongoId()
  chatId: string;
}
