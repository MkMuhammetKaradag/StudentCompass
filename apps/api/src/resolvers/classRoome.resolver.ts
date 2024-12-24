import {
  AuthGuard,
  AuthUser,
  ClassRoom,
  ClassCommands,
  CreateClassInput,
  CurrentUser,
  PUB_SUB,
  RolesGuard,
  UserRole,
  ClassRoomJoinLink,
  CreateClassRoomJoinLinkInput,
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

@Resolver('ClassRoome')
export class ClassRoomeResolver {
  constructor(
    @Inject('CLASSROOME_SERVICE')
    private readonly classService: ClientProxy,

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
  private async sendCommand<T>(cmd: ClassCommands, payload: any): Promise<T> {
    try {
      return await firstValueFrom<T>(this.classService.send({ cmd }, payload));
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @Query(() => String)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async getClass(@CurrentUser() user: AuthUser) {
    return 'Class';
  }

  @Mutation(() => ClassRoom)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH)
  async createClass(
    @CurrentUser() user: AuthUser,
    @Args('input')
    input: CreateClassInput,
  ): Promise<ClassRoom> {
    const data = await this.sendCommand<ClassRoom>(ClassCommands.CREATE_CLASS, {
      currentUserId: user._id,
      payload: input,
    });
    console.log('dat');
    console.log(data);
    return data;
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.COACH)
  async createClassRoomJoinLink(
    @CurrentUser() user: AuthUser,
    @Args('input')
    input: CreateClassRoomJoinLinkInput,
  ): Promise<String> {
    const data = await this.sendCommand<ClassRoomJoinLink>(
      ClassCommands.CREATE_CLASS_JOIN_LINK,
      {
        currentUserId: user._id,
        payload: input,
      },
    );

    return 'data';
    // return data;
  }
}
