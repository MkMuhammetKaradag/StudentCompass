import { Controller, Get, Inject } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import {
  AssignmentCommands,
  CreateAssignmentInput,
  SharedService,
  WithCurrentUserId,
} from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  private async handleMessage<T>(
    context: RmqContext,
    handler: () => Promise<T>,
  ): Promise<T> {
    try {
      this.sharedService.acknowledgeMessage(context);
      return await handler();
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: AssignmentCommands.CREATE_ASSIGNMENT })
  async createAssignment(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<CreateAssignmentInput>,
  ) {
    return this.handleMessage(context, () =>
      this.assignmentService.createAssignment(input),
    );
  }

  @MessagePattern({ cmd: AssignmentCommands.GET_ASSIGNMENT })
  async getAssignment(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      assignmentId: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.assignmentService.getAssignment(input),
    );
  }

  @MessagePattern({ cmd: AssignmentCommands.GET_MY_ASSIGNMENTS })
  async getMyAssignments(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId,
  ) {
    return this.handleMessage(context, () =>
      this.assignmentService.getMyAssignments(input),
    );
  }
}
