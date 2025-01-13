import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Types } from 'mongoose';
import { MediaContentInput } from './MediaContentInput';
import { MessageType } from '@app/shared/schemas/message.schema';

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsMediaContentRequired', async: false })
export class IsMediaContentRequiredConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    if (object.type === MessageType.MEDIA) {
      return !!value;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `Media content is required when type is MEDIA.`;
  }
}

export function IsMediaContentRequired(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMediaContentRequiredConstraint,
    });
  };
}

@InputType()
export class SendMessageInput {
  @Field()
  @IsMongoId()
  chatId: string;

  @Field(() => MessageType)
  @IsEnum(MessageType)
  type: MessageType;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  content?: string;

  @Field(() => MediaContentInput, { nullable: true })
  @ValidateNested()
  @IsMediaContentRequired({
    message: 'Media content is required when type is MEDIA.',
  })
  mediaContent?: MediaContentInput;
}
