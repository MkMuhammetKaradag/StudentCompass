import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export class PasswordReset {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}
export type PasswordResetDocument = PasswordReset & Document;
export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);
