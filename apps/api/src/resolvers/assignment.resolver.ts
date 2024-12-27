import {
  Assignment,
  AssignmentCommands,
  AuthGuard,
  AuthUser,
  CreateAssignmentInput,
  CurrentUser,
  PUB_SUB,
  RolesGuard,
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

@Resolver('assignment')
export class AssignmentResolver {
  constructor(
    @Inject('ASSIGNMENT_SERVICE')
    private readonly assignmentService: ClientProxy,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
    cmd: AssignmentCommands,
    payload: any,
  ): Promise<T> {
    try {
      return await firstValueFrom<T>(
        this.assignmentService.send({ cmd }, payload),
      );
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @Mutation(() => Assignment)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  async createAssignment(
    @CurrentUser() user: AuthUser,
    @Args('input')
    input: CreateAssignmentInput,
  ): Promise<Assignment> {
    const data = await this.sendCommand<Assignment>(
      AssignmentCommands.CREATE_ASSIGNMENT,
      {
        currentUserId: user._id,
        payload: input,
      },
    );

    return data;
  }
}
