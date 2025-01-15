import {
  AuthGuard,
  AuthUser,
  CurrentUser,
  Notification,
  NotificationCommands,
  NotificationType,
  PUB_SUB,
  RedisService,
  RolesGuard,
  User,
  UserCommands,
  UserRole,
} from '@app/shared';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { RedisPubSub } from 'graphql-redis-subscriptions';

import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { Roles } from '@app/shared/common/decorators/roles.decorator';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: ClientProxy,
    @Inject('USER_SERVICE')
    private readonly userService: ClientProxy,

    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
    cmd: NotificationCommands,
    payload: any,
  ): Promise<T> {
    try {
      console.log(payload);
      return await firstValueFrom<T>(
        this.notificationService.send({ cmd }, payload),
      );
    } catch (error) {
      this.handleError(
        'An error occurred during the request.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @Query(() => [Notification])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async getNotification(@CurrentUser() user: AuthUser) {
    const data = this.sendCommand<Notification[]>(
      NotificationCommands.GET_NOTIFICATION,
      {
        currentUserId: user._id,
      },
    );

    return data;
  }
  @ResolveField(() => User)
  async sender(@Parent() notification: Notification): Promise<User> {
 

    const data = await firstValueFrom<User>(
      this.userService.send(
        { cmd: UserCommands.GET_USER },
        {
          userId: notification.sender.toString(),
        },
      ),
    );

    return data;
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async sendNotification(
    @CurrentUser() user: AuthUser,
    @Args({ name: 'recipientIds', type: () => [String] })
    recipientIds: string[],
    @Args('message') message: string,
    @Args('type', { type: () => NotificationType, nullable: true })
    type?: NotificationType,
  ): Promise<String> {

    this.notificationService.emit(NotificationCommands.SEND_NOTIFICATION, {
      sender: {
        _id: user._id,
        userName: 'test',
        profilePhoto: null,
      },
      recipientIds,
      message,
      type,
    });
    return 'send';
  }

  @UseGuards(AuthGuard)
  @Subscription(() => Notification, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        throw new BadRequestException();
      }
      const user = req.user;
      const isUserInRecipients = await this.isUserInRecipients(
        payload.userNotifications.recipients,
        user._id,
      );
      return isUserInRecipients;
    },
  })
  userNotifications() {
    return this.pubSub.asyncIterator('userNotifications');
  }

  async isUserInRecipients(
    recipients: string[],
    userId: string,
  ): Promise<boolean> {
    return recipients.includes(userId);
  }
}
