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
  GradeAssignmentInput,
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

  async createAssignment(input: WithCurrentUserId<CreateAssignmentInput>) {
    const { currentUserId, payload } = input;

    if (payload.assignmentType === AssignmentType.CLASS && payload.classRoom) {
      const classRoom = await this.classRoomModel.findById(payload.classRoom);

      if (
        !classRoom ||
        !classRoom.coachs.includes(new Types.ObjectId(currentUserId))
      ) {
        this.handleError('Invalid class', HttpStatus.BAD_REQUEST);
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
      if (validStudents.length === 0) {
        this.handleError('No valid students found', HttpStatus.BAD_REQUEST);
      }
      const assignment = new this.assignmentModel({
        ...payload,
        students: validStudents,
        coach: new Types.ObjectId(currentUserId),
      });
      return await assignment.save();
    }
    this.handleError('No valid students found', HttpStatus.BAD_REQUEST);
  }

  async getAssignment(input: WithCurrentUserId<{ assignmentId: string }>) {
    const { currentUserId, payload } = input;

    const assignment = await this.assignmentModel
      .aggregate([
        // İlk olarak ID'ye göre ödevi bul
        {
          $match: {
            _id: new Types.ObjectId(payload.assignmentId),
          },
        },

        // ClassRoom'u join et
        {
          $lookup: {
            from: 'classrooms', // classroom collection adı
            localField: 'classRoom',
            foreignField: '_id',
            as: 'classRoom',
          },
        },
        {
          $unwind: {
            path: '$classRoom',
            preserveNullAndEmptyArrays: true, // CLASS olmayan ödevler için
          },
        },
        {
          $lookup: {
            from: 'users', // user collection adı
            localField: 'students',
            foreignField: '_id',
            as: 'studentsData',
          },
        },

        // Ödev tipine göre kontrol
        {
          $match: {
            $or: [
              {
                coach: new Types.ObjectId(currentUserId),
              },
              {
                assignmentType: AssignmentType.INDIVIDUAL,
                students: new Types.ObjectId(currentUserId),
              },
              {
                assignmentType: AssignmentType.CLASS,
                'classRoom.students': new Types.ObjectId(currentUserId),
              },
            ],
          },
        },

        // Sadece ihtiyacımız olan alanları seç
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            assignmentType: 1,
            'classRoom.students': 1,

            studentsData: {
              _id: 1,
              profilePhoto: 1,
              userName: 1,
              // Diğer ihtiyaç duyulan user alanları
            },
          },
        },
      ])
      .then((results) => results[0] || null);
    if (!assignment) {
      this.handleError(
        'Assignment not found or access denied',
        HttpStatus.NOT_FOUND,
      );
    }
    assignment.students = assignment.studentsData;
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
      .aggregate([
        // İlk olarak ID'ye göre ödevi bul
        {
          $match: {
            _id: new Types.ObjectId(payload.assignmentId),
          },
        },

        // ClassRoom'u join et
        {
          $lookup: {
            from: 'classrooms', // classroom collection adı
            localField: 'classRoom',
            foreignField: '_id',
            as: 'classRoom',
          },
        },

        // Array'i tekil dokümana çevir
        {
          $unwind: {
            path: '$classRoom',
            preserveNullAndEmptyArrays: true, // CLASS olmayan ödevler için
          },
        },

        // Ödev tipine göre kontrol
        {
          $match: {
            $or: [
              {
                assignmentType: AssignmentType.INDIVIDUAL,
                students: new Types.ObjectId(currentUserId),
              },
              {
                assignmentType: AssignmentType.CLASS,
                'classRoom.students': new Types.ObjectId(currentUserId),
              },
            ],
          },
        },

        // Sadece ihtiyacımız olan alanları seç
        {
          $project: {
            _id: 1,
            assignmentType: 1,
            'classRoom.students': 1,
            students: 1,
            // diğer ihtiyacınız olan alanlar...
          },
        },
      ])
      .then((results) => results[0] || null);
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

  async gradeAssignment(input: WithCurrentUserId<GradeAssignmentInput>) {
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
  async getAssignmentSubmissions(
    input: WithCurrentUserId<{
      assignmentId: string;
    }>,
  ) {
    const { currentUserId, payload } = input;
    const assignmentSubmissions =
      await this.assignmentSubmissionModel.aggregate([
        {
          $match: {
            assignment: new Types.ObjectId(payload.assignmentId),
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'student',
            foreignField: '_id',
            as: 'student',
          },
        },
        {
          $unwind: {
            path: '$student', // 'student' dizisini açıyoruz
            preserveNullAndEmptyArrays: true, // Eğer öğrenci verisi yoksa null bırak
          },
        },
        {
          $lookup: {
            from: 'assignments',
            localField: 'assignment',
            foreignField: '_id',
            as: 'assignment',
          },
        },
        {
          $unwind: {
            path: '$assignment',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            'assignment.coach': new Types.ObjectId(currentUserId),
          },
        },
        {
          $project: {
            _id: 1,
            grade: 1,
            feedback: 1,
            status: 1,
            student: {
              _id: 1,
              profilePhoto: 1,
              userName: 1,
            },
            // assignment: 1,
          },
        },
      ]);

    console.log(assignmentSubmissions);

    return assignmentSubmissions;
  }

  async getMyAssignmentSubmissions(input: WithCurrentUserId) {
    const currentUserId = input.currentUserId;
    const assignmentSubmissions = await this.assignmentSubmissionModel.find({
      student: new Types.ObjectId(currentUserId),
    });
    return assignmentSubmissions;
  }
}
