import { InputType, Field } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';
import { AuthUser } from './request/user';

export class WithCurrentUserId<T = undefined> {
  @IsMongoId()
  currentUserId: string;

  payload?: T extends undefined ? never : T;
}

export class WithCurrentUser<T = undefined> {
  @IsMongoId()
  currentUser: AuthUser;

  payload?: T extends undefined ? never : T;
}
