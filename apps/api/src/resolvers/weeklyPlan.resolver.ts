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
import { ClientProxy, Payload } from '@nestjs/microservices';
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

    @Inject('ASSIGNMENT_SERVICE_RPC')
    private readonly weeklyPlanRpcService: ClientProxy,
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

  private async sendRpcCommand<T>(
    cmd: WeeklyPlanCommands,
    payload: any,
  ): Promise<T> {
    try {
      return await firstValueFrom<T>(
        this.weeklyPlanRpcService.send({ cmd }, payload),
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
    return this.sendRpcCommand<WeeklyPlan>(
      WeeklyPlanCommands.CREATE_WEEKLY_PLAN,
      {
        currentUserId: user._id,
        payload: input,
      },
    );
  }

  @Query(() => WeeklyPlan)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH, UserRole.STUDENT, UserRole.ADMIN)
  async getWeeklyPlan(
    @Args('weeklyPlanId', { nullable: true }) weeklyPlanId: string,
    @Args('classRoomId', { nullable: true }) classRoomId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WeeklyPlan> {
    return this.sendRpcCommand<WeeklyPlan>(WeeklyPlanCommands.GET_WEEKLY_PLAN, {
      currentUserId: user._id,
      payload: {
        weeklyPlanId,
        classRoomId,
      },
    });
  }

  @Query(() => [WeeklyPlan])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH, UserRole.STUDENT, UserRole.ADMIN)
  async getMyWeeklyPlans(@CurrentUser() user: AuthUser): Promise<WeeklyPlan[]> {
    return this.sendRpcCommand<WeeklyPlan[]>(
      WeeklyPlanCommands.GET_MY_WEEKLY_PLANS,
      {
        currentUserId: user._id,
      },
    );
  }
}
