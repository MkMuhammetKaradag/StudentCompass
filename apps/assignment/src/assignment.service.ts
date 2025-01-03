import {
  Assignment,
  AssignmentDocument,
  AssignmentSubmission,
  AssignmentSubmissionDocument,
  AssignmentSubmissionStatus,
  AssignmentType,
  ClassRoom,
  ClassRoomDocument,
  CreateAssignmentInput,
  CreateAssignmentSubmissionInput,
  User,
  UserDocument,
  WithCurrentUserId,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
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

    @InjectModel(AssignmentSubmission.name, 'assignment')
    private readonly assignmentSubmissionModel: Model<AssignmentSubmissionDocument>,
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

  async getMyAssignments(input: WithCurrentUserId) {
    const { currentUserId } = input;
    const assignmetns = await this.assignmentModel.aggregate([
      {
        // 1. Adım: Öğrenciye atanmış bireysel ödevleri bul
        $match: {
          $or: [
            { students: new Types.ObjectId(currentUserId) }, // Bireysel ödevler
            { classRoom: { $exists: true } }, // Sınıf ödevleri (classRoom alanı var olanlar)
          ],
        },
      },
      {
        // 2. Adım: Sınıf ödevleri için, öğrencinin dahil olduğu sınıfları kontrol et
        $lookup: {
          from: 'classrooms', // Sınıf koleksiyonu
          localField: 'classRoom', // Assignment'taki classRoom alanı
          foreignField: '_id', // ClassRoom'daki _id alanı
          as: 'classRoomDetails', // classRoom bilgilerini taşıyacak alan
        },
      },
      {
        // 3. Adım: Öğrenci sınıfın bir parçası mı kontrol et
        $addFields: {
          isStudentInClass: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ['$classRoomDetails', []] },
                        as: 'classRoom',
                        cond: {
                          $in: [
                            new Types.ObjectId(currentUserId),
                            '$$classRoom.students',
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              true,
              false,
            ],
          },
        },
      },
      {
        // 4. Adım: İlgili olmayan sınıf ödevlerini kaldır
        $match: {
          $or: [
            { students: new Types.ObjectId(currentUserId) }, // Bireysel ödevler
            { isStudentInClass: true }, // Öğrencinin sınıfta olduğu ödevler
          ],
        },
      },
      {
        // 5. Adım: Gereksiz alanları kaldır
        $project: {
          classRoomDetails: 0,
          isStudentInClass: 0,
        },
      },
    ]);

    return assignmetns;
  }

  async submitAssignment(
    input: WithCurrentUserId<CreateAssignmentSubmissionInput>,
  ) {
    const { currentUserId, payload } = input;

    const existingSubmission = await this.assignmentSubmissionModel.findOne({
      assignment: new Types.ObjectId(payload.assignmentId),
      student: new Types.ObjectId(currentUserId),
    });

    if (existingSubmission) {
      this.handleError(
        'You have already submitted this assignment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const assignment = await this.assignmentModel
      .findOne({
        _id: payload.assignmentId,
        $or: [
          {
            assignmentType: AssignmentType.INDIVIDUAL,
            students: new Types.ObjectId(currentUserId),
          },
          {
            assignmentType: AssignmentType.CLASS,
            classRoom: {
              $exists: true,
            },
          },
        ],
      })
      .populate({
        path: 'classRoom',
        match: {
          students: new Types.ObjectId(currentUserId),
        },
        select: 'students',
      });
    console.log(assignment);

    if (!assignment) {
      this.handleError('assignment not found', HttpStatus.NOT_FOUND);
    }

    const assignmentSubmission = new this.assignmentSubmissionModel({
      assignment: new Types.ObjectId(payload.assignmentId),
      student: new Types.ObjectId(currentUserId),
      attachments: payload.attachments,
      description: payload.description,
    });

    return await assignmentSubmission.save();
  }

  async gradeAssignment(
    input: WithCurrentUserId<{
      submissionId: string;
      feedback: string | null;
      grade: number;
    }>,
  ) {
    const { currentUserId, payload } = input;
    const assignmentSubmission = await this.assignmentSubmissionModel
      .findById(payload.submissionId)
      .populate({
        path: 'assignment',
        select: 'coach',
        model: 'Assignment',
      });
    if (!assignmentSubmission) {
      this.handleError('submission not found', HttpStatus.NOT_FOUND);
    }
    // const assignment = await this.assignmentModel.findById(
    //   assignmentSubmission.assignment,
    // );
    // if (!assignment) {
    //   this.handleError('assignment not found', HttpStatus.NOT_FOUND);
    // }
    const asssignment =
      assignmentSubmission.assignment as unknown as Assignment;
    if (asssignment.coach.toString() !== currentUserId) {
      this.handleError('unauthorized', HttpStatus.UNAUTHORIZED);
    }
    assignmentSubmission.feedback = payload.feedback;
    assignmentSubmission.grade = payload.grade > 0 ? payload.grade : 0;
    assignmentSubmission.status = AssignmentSubmissionStatus.GRADED;
    return await assignmentSubmission.save();
  }
}
