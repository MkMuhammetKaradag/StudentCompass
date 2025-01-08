import {
  ClassRoom,
  ClassRoomDocument,
  CreateTaskInput,
  Task,
  TaskDocument,
  User,
  UserDocument,
  WeeklyPlan,
  WeeklyPlanDocument,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(WeeklyPlan.name, 'assignment')
    private readonly weeklyPlanModel: Model<WeeklyPlanDocument>,

    @InjectModel(Task.name, 'assignment')
    private readonly taskModel: Model<TaskDocument>,
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

  async createTask(input: WithCurrentUserId<CreateTaskInput>): Promise<any> {
    const {
      currentUserId,
      payload: {
        day,
        description,
        endTime,
        startTime,
        taskType,
        weeklyPlan,
        classRoom,
        status,
        student,
      },
    } = input;
    const dbWeeklyPlan = await this.weeklyPlanModel.findById(weeklyPlan);
    if (dbWeeklyPlan.coach.toString() !== currentUserId) {
      this.handleError(
        'You are not allowed to create task for this weekly plan',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Eğer öğrenci ve sınıf bilgisi verilmişse sadece birini kabul et
    if (student && classRoom) {
      this.handleError(
        'Student and ClassRoom cannot be both provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const overlappingTask = await this.taskModel.findOne({
      weeklyPlan: new Types.ObjectId(weeklyPlan),
      day: day,
      $and: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        },
      ],
    });
    console.log(overlappingTask);

    if (overlappingTask) {
      this.handleError(
        `A task already exists for the same day and time range: ${day} ${startTime} - ${endTime}`,
        HttpStatus.BAD_REQUEST,
      );
    }

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
    }

    if (classRoom) {
      const classroom = await this.classRoomModel.findById(classRoom);
      if (!classroom) {
        this.handleError('Classroom not found', HttpStatus.NOT_FOUND);
      }

      // Kullanıcının sınıfta koç olup olmadığını kontrol ediyoruz
      const isUserCoach = classroom.coachs.some(
        (coach) => coach.toString() === currentUserId,
      );
      if (!isUserCoach) {
        this.handleError(
          'You are not allowed to create a plan for this classroom.',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Task oluştur
    const task = new this.taskModel({
      weeklyPlan: new Types.ObjectId(weeklyPlan),
      student: student ? new Types.ObjectId(student) : null,
      classRoom: classRoom ? new Types.ObjectId(classRoom) : null,
      coach: new Types.ObjectId(currentUserId),
      day: day,
      startTime: startTime,
      endTime: endTime,
      taskType: taskType,
      description: description,
      status: status || 'todo', // Eğer status verilmezse, default olarak 'todo' olacak
    });

    // Task'ı kaydet
    await task.save();

    dbWeeklyPlan.tasks.push(task._id);
    await dbWeeklyPlan.save();
    return task;
  }
}
