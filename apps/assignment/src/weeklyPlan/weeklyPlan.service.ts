import {
  ClassRoom,
  ClassRoomDocument,
  CreateWeeklyPlanInput,
  User,
  UserDocument,
  WeeklyPlan,
  WeeklyPlanDocument,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RmqContext, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class WeeklyPlanService {
  constructor(
    @InjectModel(WeeklyPlan.name, 'assignment')
    private readonly weeklyPlanModel: Model<WeeklyPlanDocument>,
    @InjectModel(User.name, 'assignment')
    private readonly userModel: Model<UserDocument>,
    @InjectModel(ClassRoom.name, 'assignment')
    private readonly classRoomModel: Model<ClassRoomDocument>,
  ) {}

  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new RpcException({
      message,
      statusCode: statusCode,
      error: error,
    });
  }

  async createWeeklyPlan(
    input: WithCurrentUserId<CreateWeeklyPlanInput>,
  ): Promise<any> {
    const {
      currentUserId,
      payload: { repeat, repeatUntil, classRoom, student },
    } = input;

    // Student ve ClassRoom aynı anda gönderilmemeli
    if (student && classRoom) {
      this.handleError(
        'You cannot assign a plan to both a student and a classroom at the same time.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Student için doğrulama
    if (student) {
      const user = await this.userModel.findById(currentUserId);
      if (!user) {
        this.handleError('User not found', HttpStatus.NOT_FOUND);
      }

      // Gönderilen öğrenci, kullanıcının öğrencisi mi kontrolü
      const isStudentCoachedByUser = user.coachedStudents.some(
        (s) => s.toString() === student,
      );
      if (!isStudentCoachedByUser) {
        this.handleError(
          'You are not allowed to create a plan for this student.',
          HttpStatus.FORBIDDEN,
        );
      }

      const existingPlan = await this.weeklyPlanModel.findOne({
        student: new Types.ObjectId(student),
        coach: new Types.ObjectId(currentUserId), // Aynı koç tarafından atanmış mı kontrolü
      });

      if (existingPlan) {
        this.handleError(
          'You have already created a weekly plan for this student.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Classroom için doğrulama
    if (classRoom) {
      const dbclassroom = await this.classRoomModel.findById(classRoom);
      if (!dbclassroom) {
        this.handleError('Classroom not found', HttpStatus.NOT_FOUND);
      }

      // Kullanıcının sınıfta koç olup olmadığını kontrol ediyoruz
      const isUserCoach = dbclassroom.coachs.some(
        (coach) => coach.toString() === currentUserId,
      );
      if (!isUserCoach) {
        this.handleError(
          'You are not allowed to create a plan for this classroom.',
          HttpStatus.FORBIDDEN,
        );
      }

      const existingPlan = await this.weeklyPlanModel.findOne({
        classRoom: new Types.ObjectId(classRoom),
      });
      if (existingPlan) {
        this.handleError(
          'A weekly plan already exists for this classroom.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const formattedRepeatUntil = repeatUntil ? new Date(repeatUntil) : null;
    if (repeatUntil && isNaN(formattedRepeatUntil.getTime())) {
      this.handleError(
        'Invalid date format for repeatUntil.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const weeklyPlan = new this.weeklyPlanModel({
      repeat,
      repeatUntil: formattedRepeatUntil,
      classRoom: classRoom ? new Types.ObjectId(classRoom) : null,
      student: student ? new Types.ObjectId(student) : null,
      coach: new Types.ObjectId(currentUserId),
    });

    return weeklyPlan.save();
  }

  async getWeeklyPlan(
    input: WithCurrentUserId<{
      weeklyPlanId?: string;
      classRoomId?: string;
    }>,
  ) {
    const {
      currentUserId,
      payload: { weeklyPlanId, classRoomId },
    } = input;
    if (!weeklyPlanId && !classRoomId) {
      this.handleError(
        'Either weeklyPlanId or classRoomId is required.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const weeklyPlan = await this.weeklyPlanModel.findOne({
      $or: [
        { _id: new Types.ObjectId(weeklyPlanId) },
        { classRoom: new Types.ObjectId(classRoomId) },
      ],
    });
    if (!weeklyPlan) {
      this.handleError('WeeklyPlan not found', HttpStatus.NOT_FOUND);
    }
    const isNotAllowed =
      (!weeklyPlan.student ||
        weeklyPlan.student.toString() !== currentUserId) &&
      (!weeklyPlan.classRoom ||
        weeklyPlan.classRoom.toString() !== classRoomId) &&
      weeklyPlan.coach.toString() !== currentUserId;

    if (isNotAllowed) {
      this.handleError(
        'You are not allowed to access this plan.',
        HttpStatus.FORBIDDEN,
      );
    }
    await weeklyPlan.populate({
      path: 'tasks',
      // select: '_id day',
      model: 'Task',
    });

    return weeklyPlan;
  }

  async getMyWeeklyPlans(input: WithCurrentUserId) {
    const { currentUserId } = input;
    const weeklyPlans = await this.weeklyPlanModel.find({
      student: new Types.ObjectId(currentUserId),
      // $or: [{ student: currentUserId }, { coach: currentUserId }],
    });
    return weeklyPlans;
  }
}
