import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ChatMessage } from './ChatMessage';

@ObjectType()
export class GetChatMessagesObject {
  @Field(() => [ChatMessage])
  messages: ChatMessage[];

  @Field()
  totalMessages: number;

  @Field()
  totalPages: number;

  @Field()
  currentPage: number;
}
