import { Connection, Model } from 'mongoose';
import { User, UserDocument, UserSchema } from '../schemas/user.schema';
import { StudentDocument, StudentSchema } from '../schemas/student.schema';
import { CoachDocument, CoachSchema } from '../schemas/coach.schema';
export const UserModels = (userModel: Model<UserDocument>) => {
  if (!userModel.discriminator) {
    throw new Error('Provided userModel is not a valid Mongoose model.');
  }
  const BaseUserModel = userModel;
  const StudentModel = BaseUserModel.discriminator<StudentDocument>(
    'Student',
    StudentSchema,
  );
  const CoachModel = BaseUserModel.discriminator<CoachDocument>(
    'Coach',
    CoachSchema,
  );

  return { BaseUserModel, StudentModel, CoachModel };
};
