import {
  CoachingRequest,
  CoachingRequestDocument,
  CoachingRequestStatus,
  SendCoachingRequestInput,
  User,
  UserDocument,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class CoachService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
    @InjectModel(CoachingRequest.name, 'user')
    private coachingRequestModel: Model<CoachingRequestDocument>,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new RpcException({
      message,
      statusCode: statusCode,
      cause: error,
    });
  }

  async updateCoachingRequestStatus(
    requestId: string,
    status: CoachingRequestStatus,
  ) {
    try {
      const request = await this.coachingRequestModel.findOneAndUpdate(
        {
          _id: requestId,
          status: CoachingRequestStatus.PENDING,
        },
        { status },
        { new: true },
      );
      console.log(request);

      if (!request) {
        this.handleError('Coaching request not found', HttpStatus.NOT_FOUND);
      }
      if (status === CoachingRequestStatus.ACCEPTED) {
        await this.userModel.findByIdAndUpdate(request.coach, {
          $push: { coachedStudents: request.student },
        });
      }

      return request;
    } catch (error) {
      this.handleError(
        'Error updating coaching request status',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
}
