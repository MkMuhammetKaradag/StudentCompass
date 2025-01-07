import { TaskStatus } from '@app/shared/schemas/task.schema';
import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateTaskInput {
  @Field(() => ID)
  weeklyPlan: string; // Görevin bağlı olduğu haftalık plan ID'si

  @Field(() => ID, { nullable: true })
  student?: string; // Plan bir öğrenciye aitse öğrenci ID'si

  @Field(() => ID, { nullable: true })
  classRoom?: string; // Plan bir sınıfa aitse sınıf ID'si

  @Field()
  day: string; // Haftanın günü (örneğin: "Monday")

  @Field()
  startTime: string; // Görev başlangıç saati (örneğin: "13:00")

  @Field()
  endTime: string; // Görev bitiş saati (örneğin: "15:00")

  @Field()
  taskType: string; // Görev türü (örneğin: "Matematik Sorusu")

  @Field()
  description: string; // Görevin detay açıklaması

  @Field(() => TaskStatus, { nullable: true })
  status?: TaskStatus = TaskStatus.TODO; // Görev durumu, varsayılan değer TODO
}
