import { Controller, Get, Inject } from '@nestjs/common';
import { UserService } from './user.service';
import {
  SendCoachingRequestInput,
  SharedService,
  StudentCommands,
} from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
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
  async signUp(
    @Ctx() context: RmqContext,
    @Payload() input: SendCoachingRequestInput,
  ) {
    // return this.handleMessage(context, () => this.authService.signUp(input));
  }
}
