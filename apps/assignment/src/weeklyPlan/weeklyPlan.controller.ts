import { Controller, Inject } from '@nestjs/common';
import { WeeklyPlanService } from './weeklyPlan.service';
import { MessagePattern, RmqContext } from '@nestjs/microservices';
import { SharedService, WeeklyPlaneCommands } from '@app/shared';

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

  @MessagePattern({ cmd: WeeklyPlaneCommands.CREATE_WEEKLY_PLAN })
  async createWeeklyPlan(): Promise<any> {
    return this.weekleyPlanService.createWeeklyPlan();
  }
}
