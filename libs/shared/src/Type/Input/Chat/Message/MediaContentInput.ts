import { MediaType } from '@app/shared/schemas/mediaContent.schema';
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';


@InputType()
export class MediaContentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  url: string;

  @Field(() => MediaType)
  @IsEnum(MediaType)
  type: MediaType;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @Field({ nullable: true })
  @IsOptional()
  duration?: number;

  @Field({ nullable: true })
  @IsOptional()
  size?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  mimeType?: string;
}
