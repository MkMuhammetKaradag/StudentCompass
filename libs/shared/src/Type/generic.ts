import { InputType, Field } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';

export class WithCurrentUserId<T = undefined> {
  @IsMongoId()
  currentUserId: string;

  payload?: T extends undefined ? never : T;
}
