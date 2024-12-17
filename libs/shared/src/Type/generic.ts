import { InputType, Field } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';

export class WithCurrentUserId<T> {
  @IsMongoId()
  currentUserId: string;

  payload: T;
}
