import { User, UserDocument } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
  ) {}
  async getUser(userId: string) {
    console.log(userId);
    return this.userModel.findById(userId);
  }
}
