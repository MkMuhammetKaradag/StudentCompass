import {
  AuthGuard,
  AuthUser,
  CreateTaskInput,
  CurrentUser,
  PUB_SUB,
  RedisService,
  RolesGuard,
  Task,
  TaskCommands,
  UserRole,
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

@Resolver('task')
export class TaskResolver {
  constructor(
    @Inject('TASK_SERVICE')
    private readonly taskService: ClientProxy,

    @Inject('TASK_SERVICE_RPC')
    private readonly taskRpcService: ClientProxy,
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
  private async sendCommand<T>(cmd: TaskCommands, payload: any): Promise<T> {
    try {
      return await firstValueFrom<T>(this.taskService.send({ cmd }, payload));
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  private async sendRpcCommand<T>(cmd: TaskCommands, payload: any): Promise<T> {
    try {
      return await firstValueFrom<T>(
        this.taskRpcService.send({ cmd }, payload),
      );
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  @Mutation(() => Task)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH)
  async createTask(
    @Args('input') input: CreateTaskInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Task> {
    return this.sendRpcCommand<Task>(TaskCommands.CREATE_TASK, {
      currentUserId: user._id,
      payload: input,
    });
  }
}
