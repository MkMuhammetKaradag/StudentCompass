import {
  CoachingRequest,
  CoachingRequestDocument,
  CoachingRequestStatus,
  GetCoachingRequestInput,
  User,
  UserDocument,
  UserRole,
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

      if (!request) {
        this.handleError('Coaching request not found', HttpStatus.NOT_FOUND);
      }
      if (status === CoachingRequestStatus.ACCEPTED) {
        await this.coachingRequestModel.updateMany(
          {
            student: request.student,
            status: CoachingRequestStatus.PENDING,
            _id: { $ne: requestId },
          },
          {
            status: CoachingRequestStatus.REJECTED,
            message:
              'Student already has a coach. This request has been rejected.',
          },
        );
        
        await this.userModel.findByIdAndUpdate(request.coach, {
          $addToSet: { coachedStudents: request.student },
        });

        await this.userModel.findByIdAndUpdate(request.student, {
          coach: request.coach,
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

  async getCoachingRequest(input: WithCurrentUserId<GetCoachingRequestInput>) {
    const { currentUserId, payload } = input;

    // Find user and validate existence
    const user = await this.userModel.findById(currentUserId);
    if (!user) {
      this.handleError('User not found.', HttpStatus.NOT_FOUND);
    }
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    const isCoach = user.roles.includes(UserRole.COACH);
    // // If not admin or executive, throw error
    if (!isAdmin && !isCoach) {
      this.handleError(
        'User is not authorized to view the requests.',
        HttpStatus.FORBIDDEN,
      );
    }
    const populateConfig = {
      path: 'student',
      select: '_id userName profilePhoto',
    };
    const coachingId =
      payload.coachingId && isAdmin ? payload.coachingId : currentUserId;
    const request = await this.coachingRequestModel
      .find({
        coach: new Types.ObjectId(coachingId),
        status: payload.status,
      })
      .populate(populateConfig);
    return request;
  }

  async getCoach(input: WithCurrentUserId) {
    // const { currentUserId, payload } = input;
    // const user = await this.userModel.findById(currentUserId);
    // if (!user) {
    //   this.handleError('User not found.', HttpStatus.NOT_FOUND);
    // }
    const coach = await this.userModel.find({
      roles: {
        $in: UserRole.COACH,
      },
    });
    return coach;
  }
}
