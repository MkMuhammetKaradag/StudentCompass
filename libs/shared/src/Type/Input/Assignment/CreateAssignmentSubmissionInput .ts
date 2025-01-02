import { InputType, Field, ID } from '@nestjs/graphql';


@InputType()
export class CreateAssignmentSubmissionInput {
  @Field(() => ID)
  assignmentId: string;

  @Field(() => String)
  description: string;

  @Field(() => [String], { nullable: true })
  attachments?: string[];

}
