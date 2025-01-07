import { Controller, Inject } from '@nestjs/common';
import { TaskService } from './task.service';
import {
  CreateTaskInput,
  SharedService,
  TaskCommands,
  WithCurrentUserId,
} from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
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

  @MessagePattern({ cmd: TaskCommands.CREATE_TASK })
  async createWeeklyPlan(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<CreateTaskInput>,
  ): Promise<any> {
    return this.handleMessage(context, () =>
      this.taskService.createTask(input),
    );
  }
}
