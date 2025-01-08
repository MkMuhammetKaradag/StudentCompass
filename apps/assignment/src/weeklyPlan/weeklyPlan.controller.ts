import { Controller, Inject } from '@nestjs/common';
import { WeeklyPlanService } from './weeklyPlan.service';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import {
  CreateWeeklyPlanInput,
  SharedService,
  WeeklyPlanCommands,
  WithCurrentUserId,
} from '@app/shared';

@Controller()
export class WeeklyPlanController {
  constructor(
    private readonly weekleyPlanService: WeeklyPlanService,
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

  @MessagePattern({ cmd: WeeklyPlanCommands.CREATE_WEEKLY_PLAN })
  async createWeeklyPlan(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<CreateWeeklyPlanInput>,
  ): Promise<any> {
    return this.handleMessage(context, () =>
      this.weekleyPlanService.createWeeklyPlan(input),
    );
  }
  @MessagePattern({ cmd: WeeklyPlanCommands.GET_WEEKLY_PLAN })
  async getWeeklyPlan(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      weeklyPlanId?: string ;
      classRoomId?: string;
    }>,
  ): Promise<any> {
    return this.handleMessage(context, () =>
      this.weekleyPlanService.getWeeklyPlan(input),
    );
  }

  @MessagePattern({ cmd: WeeklyPlanCommands.GET_MY_WEEKLY_PLANS })
  async getMyWeeklyPlans(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId,
  ): Promise<any> {
    return this.handleMessage(context, () =>
      this.weekleyPlanService.getMyWeeklyPlans(input),
    );
  }
}
