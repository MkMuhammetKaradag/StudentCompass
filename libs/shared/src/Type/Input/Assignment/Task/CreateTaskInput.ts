import { TaskStatus } from '@app/shared/schemas/task.schema';
import { InputType, Field, ID } from '@nestjs/graphql';

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  IsNotEmpty,
  Validate,
} from 'class-validator';
@ValidatorConstraint({ name: 'isEndAfterStart', async: false })
export class IsEndAfterStart implements ValidatorConstraintInterface {
  validate(endTime: string, args: ValidationArguments) {
    const startTime = args.object['startTime']; // Güvenli şekilde `startTime`'ı alın
    if (!startTime || !endTime) return true; // Boş değerler doğrulamadan geçer
    return startTime < endTime; // endTime, startTime'dan büyük olmalı
  }

  defaultMessage(args: ValidationArguments) {
    return `'endTime' must be greater than 'startTime'.`;
  }
}

@ValidatorConstraint({ name: 'isTimeFormat', async: false })
export class IsTimeFormat implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return true; // Boş değerler doğrulamadan geçer
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // Saat formatını kontrol eder
    return timeRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `The value '${args.value}' is not in the correct time format (HH:mm).`;
  }
}

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
  @IsNotEmpty()
  @Validate(IsTimeFormat)
  startTime: string; // Görev başlangıç saati

  @Field()
  @IsNotEmpty()
  @Validate(IsTimeFormat)
  @Validate(IsEndAfterStart)
  endTime: string; // Görev bitiş saati

  @Field()
  taskType: string; // Görev türü (örneğin: "Matematik Sorusu")

  @Field()
  description: string; // Görevin detay açıklaması

  @Field(() => TaskStatus, { nullable: true })
  status?: TaskStatus = TaskStatus.TODO; // Görev durumu, varsayılan değer TODO
}
