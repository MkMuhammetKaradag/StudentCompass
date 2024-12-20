import { Controller, Get, Inject } from '@nestjs/common';
import { UserService } from '../user.service';
import {
  CancelMyCoachingRequestInput,
  GetMyCoachingRequestInput,
  SendCoachingRequestInput,
  SharedService,
  StudentCommands,
  WithCurrentUserId,
} from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { StudentService } from './student.service';

@Controller()
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
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

  @MessagePattern({ cmd: StudentCommands.SEND_COACHING_REGUEST })
  async sendCoachingRequest(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<SendCoachingRequestInput>,
  ) {
    console.log(input);
    return this.handleMessage(context, () =>
      this.studentService.sendCoachingRequest(input),
    );
  }

  @MessagePattern({ cmd: StudentCommands.GET_STUDENT })
  async getStudent(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId,
  ) {
    return this.handleMessage(context, () => this.studentService.getStudent());
  }

  @MessagePattern({ cmd: StudentCommands.GET_MY_COACHING_REGUEST })
  async getMyCoachingRequest(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<GetMyCoachingRequestInput>,
  ) {
    return this.handleMessage(context, () =>
      this.studentService.getMyCoachingRequest(input),
    );
  }

  @MessagePattern({ cmd: StudentCommands.CANCEL_MY_COACHING_REGUEST })
  async cancelMyCoachingRequest(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<CancelMyCoachingRequestInput>,
  ) {
    return this.handleMessage(context, () =>
      this.studentService.cancelMyCoachingRequest(input),
    );
  }
}
