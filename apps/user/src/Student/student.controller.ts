import { Controller, Get, Inject } from '@nestjs/common';
import { UserService } from '../user.service';
import {
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
}
