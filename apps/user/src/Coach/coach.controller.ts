import { Controller, Get, Inject } from '@nestjs/common';
import { UserService } from '../user.service';
import {
  CoachCommands,
  SendCoachingRequestInput,
  SharedService,
  StudentCommands,
  UpdateCoachingRequestInput,
  WithCurrentUserId,
} from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { CoachService } from './coach.service';

@Controller()
export class CoachController {
  constructor(
    private readonly coachService: CoachService,
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

  @MessagePattern({ cmd: CoachCommands.UPDATE_COACHING_REQUEST_STATUS })
  async updateCoachingRequestStatus(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<UpdateCoachingRequestInput>,
  ) {
    return this.handleMessage(context, () =>
      this.coachService.updateCoachingRequestStatus(
        input.payload.requestId,
        input.payload.status,
      ),
    );
  }
}
