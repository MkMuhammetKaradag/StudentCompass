import {
  Assignment,
  AssignmentDocument,
  AssignmentType,
  ClassRoom,
  ClassRoomDocument,
  CreateAssignmentInput,
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
  ) {}
  async createAssignment(input: WithCurrentUserId<CreateAssignmentInput>) {
    const { currentUserId, payload } = input;

    if (payload.assignmentType === AssignmentType.CLASS && payload.classRoom) {
      const classRoom = await this.classRoomModel.findById(payload.classRoom);

      if (!classRoom || classRoom.coach.toString() !== currentUserId) {
        throw new Error('Geçersiz sınıf');
      }
    }
    const assignment = new this.assignmentModel({
      ...payload,
      classRoom: new Types.ObjectId(payload.classRoom),
      coach: new Types.ObjectId(currentUserId),
    });

    return await assignment.save();
  }
}
