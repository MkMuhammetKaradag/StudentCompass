import { User } from '@app/shared/schemas/user.schema';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignInObject {
  @Field(() => User, { nullable: true })
  user: User;

  @Field()
  access_token: string;

  @Field()
  refresh_token: string;
}
