import { Controller, Get, Inject } from '@nestjs/common';
import { ClassService } from './class.service';
import {
  ClassCommands,
  CreateClassInput,
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
export class ClassController {
  constructor(
    private readonly classService: ClassService,
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

  @MessagePattern({ cmd: ClassCommands.CREATE_CLASS })
  async createClass(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<CreateClassInput>,
  ) {
    return this.handleMessage(context, () =>
      this.classService.createClass(input),
    );
  }
}
