import {
 
  CoachingRequest,
  CoachingRequestDocument,
  CoachingRequestStatus,
 
  GetCoachingRequestInput,
  NotificationCommands,
  NotificationType,

  User,
  UserDocument,
  UserRole,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class CoachService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,

    @InjectModel(CoachingRequest.name, 'user')
    private coachingRequestModel: Model<CoachingRequestDocument>,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationServiceClient: ClientProxy,
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
  private notificationEmitEvent(cmd: string, payload: any) {
    this.notificationServiceClient.emit(cmd, payload);
  }
  async updateCoachingRequestStatus(
    currentUserId: string,
    requestId: string,
    status: CoachingRequestStatus,
  ) {
    try {
      const request = await this.coachingRequestModel
        .findOneAndUpdate(
          {
            _id: requestId,
            status: CoachingRequestStatus.PENDING,
            coach: new Types.ObjectId(currentUserId),
          },
          { status },
          { new: true },
        )
        .populate('student');

      if (!request) {
        this.handleError('Coaching request not found', HttpStatus.NOT_FOUND);
      }
      if (status === CoachingRequestStatus.ACCEPTED) {
        const rejectedRequests =
          await this.coachingRequestModel.aggregate<CoachingRequestDocument>([
            {
              $match: {
                student: request.student._id,
                status: CoachingRequestStatus.PENDING,
                _id: { $ne: new Types.ObjectId(requestId) },
              },
            },
            {
              $project: {
                _id: 1,
                coach: 1,
              },
            },
          ]);
        const bulkUpdates = rejectedRequests.map((req) => ({
          updateOne: {
            filter: { _id: req._id },
            update: {
              status: CoachingRequestStatus.REJECTED,
              message:
                'Student already has a coach. This request has been rejected.',
            },
          },
        }));
        await this.coachingRequestModel.bulkWrite(bulkUpdates);

        const coachIds = rejectedRequests.map((req) => req.coach.toString());
        const student = request.student as any;
        this.notificationEmitEvent(NotificationCommands.SEND_NOTIFICATION, {
          senderId: student._id,
          recipientIds: coachIds,
          message: ` Coaching requests for user ${student.userName} have been cancelled`,
          notificationType: NotificationType.INFO,
        });
        const asd = await this.userModel.findByIdAndUpdate(request.coach, {
          $addToSet: { coachedStudents: request.student },
        });
        console.log('update', asd);
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
    const coach = await this.userModel.find({
      roles: {
        $in: UserRole.COACH,
      },
    });
    return coach;
  }

  async getCoachedStudents(input: WithCurrentUserId) {
    const { currentUserId } = input;
    const coach = await this.userModel.findById(currentUserId).populate({
      path: 'coachedStudents',
      select: 'userName _id profilePhoto email firstName ',
      model: 'User',
    });
    // .populate('coachedStudents');

    if (!coach) {
      this.handleError('Coach not found.', HttpStatus.NOT_FOUND);
    }
    return coach.coachedStudents;
  }
}
