import {
  CoachingRequest,
  CoachingRequestDocument,
  CoachingRequestStatus,
  GetMyCoachingRequestInput,
  SendCoachingRequestInput,
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
export class StudentService {
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

  async sendCoachingRequest(
    input: WithCurrentUserId<SendCoachingRequestInput>,
  ) {
    try {
      const { currentUserId, payload } = input;

      // 1. Öğrencinin mevcut bir koçu olup olmadığını kontrol et
      const existingUser = await this.userModel.findById(currentUserId);
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
    return this.userModel.find({
      roles: {
        $in: UserRole.STUDENT,
      },
    });
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
}
