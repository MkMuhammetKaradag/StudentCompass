import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, MinLength } from 'class-validator';

@InputType()
export class SignInput {
  @Field()
  @IsEmail()
  @MinLength(3)
  email: string;

  @Field()
  @MinLength(5)
  password: string;
}
