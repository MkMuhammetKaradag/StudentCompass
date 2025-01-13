import { MediaContent } from '@app/shared/schemas/mediaContent.schema';
import { MessageType } from '@app/shared/schemas/message.schema';
import { User } from '@app/shared/schemas/user.schema';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatMessage {
  @Field(() => ID)
  _id: string;

  @Field({ nullable: true })
  content?: string;

  @Field(() => MessageType)
  type: MessageType;

  @Field(() => User)
  sender: User;

  @Field(() => MediaContent, { nullable: true })
  media?: MediaContent;

  @Field()
  messageIsReaded: boolean;
}
