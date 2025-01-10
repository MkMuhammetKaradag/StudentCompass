import { Message } from '@app/shared/schemas/message.schema';
import { User } from '@app/shared/schemas/user.schema';
import { Field, ID, ObjectType } from '@nestjs/graphql';


@ObjectType()
export class GetUserChatsObject {
  @Field(() => ID)
  _id: string;

  @Field(() => [User])
  participants: User[];

  @Field(() => String, { nullable: true })
  chatName?: string;

  @Field(() => Message, { nullable: true })
  lastMessage: Message;

  @Field(() => Boolean)
  isAdmin: boolean;
}
