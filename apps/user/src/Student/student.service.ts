import {
  CancelMyCoachingRequestInput,
  Coach,
  CoachDocument,
  CoachingRequest,
  CoachingRequestDocument,
  CoachingRequestStatus,
  GetMyCoachingRequestInput,
  SendCoachingRequestInput,
  StudentDocument,
  User,
  UserDocument,
  UserRole,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { model, Model, Types } from 'mongoose';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
    @InjectModel(User.name, 'user') private coachModel: Model<CoachDocument>,
    @InjectModel(User.name, 'user')
    private studentModel: Model<StudentDocument>,
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

  async sendCoachingRequest(
    input: WithCurrentUserId<SendCoachingRequestInput>,
  ) {
    try {
      const { currentUserId, payload } = input;

      // 1. Öğrencinin mevcut bir koçu olup olmadığını kontrol et
      const existingUser = await this.studentModel.findById(currentUserId);
      if (!existingUser) {
        this.handleError('User not found', HttpStatus.NOT_FOUND);
      }

      if (existingUser.coach) {
        this.handleError(
          'You already have a coach. Please leave the current coach before sending a new request.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Daha önce aynı koça pending durumda bir istek olup olmadığını kontrol et
      const existingRequest = await this.coachingRequestModel.findOne({
        student: new Types.ObjectId(currentUserId),
        coach: new Types.ObjectId(payload.coachingId),
        status: CoachingRequestStatus.PENDING,
      });

      if (existingRequest) {
        this.handleError(
          'You already have a pending request to this coach.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. Yeni koçluk isteği oluştur
      const request = await this.coachingRequestModel.create({
        student: new Types.ObjectId(currentUserId),
        coach: new Types.ObjectId(payload.coachingId),
        message: payload.message,
      });

      return request;
    } catch (error) {
      this.handleError(
        'Error sending coaching request',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async getStudent() {
    const student = await this.studentModel.find({
      roles: {
        $in: UserRole.STUDENT,
      },
    });

    return student;
  }

  async getMyCoachingRequest(
    input: WithCurrentUserId<GetMyCoachingRequestInput>,
  ) {
    const { currentUserId, payload } = input;
    const coachingRequest = await this.coachingRequestModel.find({
      student: new Types.ObjectId(currentUserId),
      ...(payload.status ? { status: { $in: payload.status } } : {}),
    });
    console.log(coachingRequest);
    return coachingRequest;
  }

  async cancelMyCoachingRequest(
    input: WithCurrentUserId<CancelMyCoachingRequestInput>,
  ) {
    const {
      currentUserId,
      payload: { requestId },
    } = input;
    const coachingRequest = await this.coachingRequestModel.findOne({
      _id: new Types.ObjectId(requestId),
      student: new Types.ObjectId(currentUserId),
      status: CoachingRequestStatus.PENDING,
    });
    if (!coachingRequest) {
      this.handleError('Request Not Found', HttpStatus.NOT_FOUND);
    }
    coachingRequest.status = CoachingRequestStatus.CANCELD;
    return await coachingRequest.save();
  }
}
