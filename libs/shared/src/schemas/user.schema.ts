import {
  Field,
  HideField,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;
export enum UserRole {
  ADMIN = 'admin',
  COACH = 'coach',
  STUDENT = 'student',
  USER = 'user',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User roles',
});

@Schema({
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    },
  },
  timestamps: true,
})
@ObjectType()
export class User {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  firstName: string;

  @Prop({ required: true })
  @Field()
  lastName: string;

  @Prop({ required: true, unique: true })
  @Field()
  userName: string;

  @Prop({ required: true, unique: true })
  @Field()
  email: string;

  @Prop({ required: true })
  @HideField()
  password: string;

  @Prop()
  @Field({ nullable: true })
  profilePhoto?: string;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  @Field(() => [UserRole])
  roles: UserRole[];

  // @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  // @Field(() => [User], { nullable: true })
  // coachedStudents?: Types.ObjectId[];

  // @Prop({ type: Types.ObjectId, ref: 'User', nullable: true })
  // @Field(() => User, { nullable: true })
  // coach?: Types.ObjectId;

  // @Prop({ nullable: true })
  // @Field(() => String, { nullable: true })
  // academicLevel?: string;

  // @Prop({ type: [String], default: [] })
  // @Field(() => [String], { nullable: true })
  // interests?: string[];

  // @Prop({ nullable: true })
  // @Field({ nullable: true })
  // expertise?: string;

  // @Prop({ default: 0 })
  // @Field()
  // maxStudents: number;

  @Prop({ nullable: true })
  @Field({ nullable: true })
  bio?: string;

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true })
  deletedAt?: Date;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Prop({ required: true, default: false })
  @Field()
  status: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
