import { WeeklyPlan, WeeklyPlanDocument } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class WeeklyPlanService {
  constructor(
    @InjectModel(WeeklyPlan.name, 'assignment')
    private readonly weeklyPlanModel: Model<WeeklyPlanDocument>,
  ) {}

  async createWeeklyPlan(): Promise<any> {
    return 'Weekly Plan Created';
  }
}
