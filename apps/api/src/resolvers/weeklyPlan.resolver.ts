import {
  AuthGuard,
  AuthUser,
  CreateWeeklyPlanInput,
  CurrentUser,
  PUB_SUB,
  RedisService,
  RolesGuard,
  UserRole,
  WeeklyPlan,
  WeeklyPlanCommands,
} from '@app/shared';
import { HttpStatus, Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { RedisPubSub } from 'graphql-redis-subscriptions';

import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { Roles } from '@app/shared/common/decorators/roles.decorator';

@Resolver('weeklyPlan')
export class WeeklyPlanResolver {
  constructor(
    @Inject('WEEKLY_PLAN_SERVICE')
    private readonly weeklyPlanService: ClientProxy,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    this.logger.error(`Exception: ${message} ${JSON.stringify(error)}`);
    throw new GraphQLError(error.message || message, {
      extensions: {
        code: error.statusCode || statusCode,
        cause: error.cause,
      },
    });
  }
  private async sendCommand<T>(
    cmd: WeeklyPlanCommands,
    payload: any,
  ): Promise<T> {
    try {
      return await firstValueFrom<T>(
        this.weeklyPlanService.send({ cmd }, payload),
      );
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  @Mutation(() => WeeklyPlan)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH)
  async createWeeklyPlan(
    @Args('input') input: CreateWeeklyPlanInput,
    @CurrentUser() user: AuthUser,
  ): Promise<WeeklyPlan> {

    return this.sendCommand<WeeklyPlan>(WeeklyPlanCommands.CREATE_WEEKLY_PLAN, {
      currentUserId: user._id,
      payload: input,
    });
  }
}
