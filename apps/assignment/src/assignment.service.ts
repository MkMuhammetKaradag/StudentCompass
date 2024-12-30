import {
  Assignment,
  AssignmentDocument,
  AssignmentType,
  ClassRoom,
  ClassRoomDocument,
  CreateAssignmentInput,
  User,
  UserDocument,
  WithCurrentUserId,
} from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectModel(Assignment.name, 'assignment')
    private readonly assignmentModel: Model<AssignmentDocument>,

    @InjectModel(ClassRoom.name, 'assignment')
    private readonly classRoomModel: Model<ClassRoomDocument>,

    @InjectModel(User.name, 'assignment')
    private readonly userModel: Model<UserDocument>,
  ) {}

  private async validateCoachStudents(
    coachId: string,
    studentIds: string[],
  ): Promise<Types.ObjectId[]> {
    // User servisinden öğrenci-koç ilişkisini kontrol et
    const coachStudents = await this.userModel.findById(coachId);

    // Geçerli öğrencileri filtrele
    return coachStudents.coachedStudents.filter((studentId) =>
      studentIds.includes(studentId.toString()),
    );
  }

  // studentIds.filter((studentId) =>
  //   coachStudents.some(
  //     (coachStudent) => coachStudent._id.toString() === studentId,
  //   ),
  // );
  // }
  async createAssignment(input: WithCurrentUserId<CreateAssignmentInput>) {
    const { currentUserId, payload } = input;

    if (payload.assignmentType === AssignmentType.CLASS && payload.classRoom) {
      const classRoom = await this.classRoomModel.findById(payload.classRoom);

      if (!classRoom || classRoom.coach.toString() !== currentUserId) {
        throw new Error('Geçersiz sınıf');
      }
      const assignment = new this.assignmentModel({
        ...payload,
        classRoom: new Types.ObjectId(payload.classRoom),
        coach: new Types.ObjectId(currentUserId),
      });
      return await assignment.save();
    }
    if (payload.students && payload.students.length > 0) {
      // User servisinden öğrencilerin koça ait olup olmadığını kontrol et
      const validStudents = await this.validateCoachStudents(
        currentUserId,
        payload.students,
      );

      // Eğer hiçbir öğrenci geçerli değilse hata döndür
      if (payload.students.length === 0) {
        throw new Error('Geçerli öğrenci bulunamadı');
      }
      const assignment = new this.assignmentModel({
        ...payload,
        students: validStudents,
        coach: new Types.ObjectId(currentUserId),
      });
      return await assignment.save();
    }
    throw new Error('Geçersiz öğrenci');
  }

  async getAssignment(input: WithCurrentUserId<{ assignmentId: string }>) {
    const { currentUserId, payload } = input;
    const assignment = await this.assignmentModel
      .findOne({
        _id: new Types.ObjectId(payload.assignmentId),
        // coach: currentUserId,
      })
      .populate({
        path: 'students',
        select: '_id userName profilePhoto ',
        model: 'User',
      });
    console.log(assignment);
    return assignment;
  }
}
