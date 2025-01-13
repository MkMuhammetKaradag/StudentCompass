import {
  AuthGuard,
  AuthUser,
  CurrentUser,
  Message,
  MessageCommands,
  Roles,
  RolesGuard,
  SendMessageInput,
  UserRole,
} from '@app/shared';
import { HttpStatus, Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { Logger } from 'winston';

@Resolver()
export class MessageResolver {
  constructor(
    @Inject('MESSAGE_SERVICE')
    private readonly messageService: ClientProxy,
    @Inject('MESSAGE_SERVICE_RPC')
    private readonly messageServiceRpc: ClientProxy,
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

  private async sendCommand<T>(cmd: MessageCommands, payload: any): Promise<T> {
    try {
      return await firstValueFrom<T>(
        this.messageServiceRpc.send({ cmd }, payload),
      );
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.COACH)
  @Mutation(() => Message)
  async sendMessage(
    @Args('input') input: SendMessageInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Message> {
    const data = await this.sendCommand<Message>(MessageCommands.SEND_MESSAGE, {
      currentUserId: user._id,
      payload: input,
    });

    return data;
  }
}
