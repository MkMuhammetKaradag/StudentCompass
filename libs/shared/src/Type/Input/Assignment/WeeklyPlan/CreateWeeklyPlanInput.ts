import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateWeeklyPlanInput {
  @Field(() => ID, { nullable: true })
  student?: string; // Plan bir öğrenciye aitse

  @Field(() => ID, { nullable: true })
  classRoom?: string; // Plan bir sınıfa aitse

  @Field({ defaultValue: false })
  repeat: boolean; // Plan tekrar ediyor mu?

  @Field({ nullable: true })
  repeatUntil?: Date; // Plan tekrar ediyorsa bitiş tarihi
}
