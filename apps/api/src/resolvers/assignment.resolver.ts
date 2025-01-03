import {
  Assignment,
  AssignmentCommands,
  AssignmentSubmission,
  AuthGuard,
  AuthUser,
  CreateAssignmentInput,
  CreateAssignmentSubmissionInput,
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
    @Inject('ASSIGNMENT_SERVICE_RPC')
    private readonly assignmentRpcService: ClientProxy,
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
        this.assignmentRpcService.send({ cmd }, payload),
      );
    } catch (error) {
      console.log(error);
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
    console.log('createAssignment');
    const data = await this.sendCommand<Assignment>(
      AssignmentCommands.CREATE_ASSIGNMENT,
      {
        currentUserId: user._id,
        payload: input,
      },
    );

    return data;
  }

  @Query(() => Assignment)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.STUDENT)
  async getAssignment(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId') assignmentId: string,
  ): Promise<Assignment> {
    const data = await this.sendCommand<Assignment>(
      AssignmentCommands.GET_ASSIGNMENT,
      {
        currentUserId: user._id,
        payload: {
          assignmentId,
        },
      },
    );

    return data;
  }

  @Query(() => [Assignment])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.STUDENT)
  async getMyAssignments(@CurrentUser() user: AuthUser): Promise<Assignment[]> {
    console.log('sdsd');
    const data = await this.sendCommand<Assignment[]>(
      AssignmentCommands.GET_MY_ASSIGNMENTS,
      {
        currentUserId: user._id,
      },
    );

    return data;
  }

  @Mutation(() => AssignmentSubmission)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async submitAssignment(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateAssignmentSubmissionInput,
  ): Promise<AssignmentSubmission> {
    const data = await this.sendCommand<AssignmentSubmission>(
      AssignmentCommands.SUBMIT_ASSIGNMENT,
      {
        currentUserId: user._id,
        payload: input,
      },
    );

    return data;
  }

  @Mutation(() => AssignmentSubmission)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  async gradeAssignment(
    @CurrentUser() user: AuthUser,
    @Args('submissionId') submissionId: string,
    @Args('feedback', {
      nullable: true,
    })
    feedback: string | null,
    @Args('grade') grade: number,
  ) {
    const data = await this.sendCommand<AssignmentSubmission>(
      AssignmentCommands.GRADE_ASSIGNMENT,
      {
        currentUserId: user._id,
        payload: {
          submissionId,
          feedback,
          grade,
        },
      },
    );
    return data;
  }
}
