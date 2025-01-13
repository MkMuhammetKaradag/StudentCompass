import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNumber, Min, MinLength } from 'class-validator';

@InputType()
export class GetChatMessagesInput {
  @Field()
  chatId: string;

  @Field()
  @IsNumber()
  @Min(1, { message: 'Page number must be at least 1.' })
  page: number = 1; // Default value is 1

  @Field()
  @IsNumber()
  @Min(1, { message: 'Limit must be at least 1.' })
  limit: number = 10; // Default value is 10

  @Field({ nullable: true })
  @IsNumber()
  @Min(0, { message: 'Extra pass value must be 0 or greater.' })
  extraPassValue?: number = 0; // Default value is 0
}
