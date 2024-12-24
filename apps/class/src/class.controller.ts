import { Controller, Get, Inject } from '@nestjs/common';
import { ClassService } from './class.service';
import {
  ClassCommands,
  CreateClassInput,
  CreateClassRoomJoinLinkInput,
  SharedService,
  WithCurrentUserId,
} from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class ClassController {
  constructor(
    private readonly classService: ClassService,
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

  @MessagePattern({ cmd: ClassCommands.CREATE_CLASS })
  async createClass(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<CreateClassInput>,
  ) {
    return this.handleMessage(context, () =>
      this.classService.createClass(input),
    );
  }

  @MessagePattern({ cmd: ClassCommands.CREATE_CLASS_JOIN_LINK })
  async createClassRoomeJoinLink(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<CreateClassRoomJoinLinkInput>,
  ) {
    return this.handleMessage(context, () =>
      this.classService.createJoinLink(input),
    );
  }

  @MessagePattern({ cmd: ClassCommands.JOIN_CLASS_ROOM })
  async joinClassRoom(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      token: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.classService.joinClassRoom(input),
    );
  }

  @MessagePattern({ cmd: ClassCommands.LEAVE_CLASS_ROOM })
  async leaveClassRoom(
    @Ctx() context: RmqContext,
    @Payload()
    input: WithCurrentUserId<{
      classRoomId: string;
    }>,
  ) {
    return this.handleMessage(context, () =>
      this.classService.leaveClassRoom(input),
    );
  }
}
