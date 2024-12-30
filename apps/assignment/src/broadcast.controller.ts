import { User, UserDocument } from '@app/shared';
import {
  BroadcastConsumerService,
  ROUTING_KEYS,
  SERVICE_BINDINGS,
} from '@app/shared/services/broadcast.consumer.service';
import { Controller, HttpStatus, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Controller('broadcast')
export class BroadcastController implements OnModuleInit {
  constructor(
    @InjectModel(User.name, 'assignment')
    private readonly userModel: Model<UserDocument>,
    private readonly broadcastConsumer: BroadcastConsumerService,
  ) {}

  async onModuleInit() {
    await this.broadcastConsumer.consume('assignment', async (message) => {
      // console.log('ClassRoom service received:', message);
      if (this.isRoutingKeyForService(message.routingKey, 'assignment')) {
        switch (message.routingKey) {
          case ROUTING_KEYS.USER_ADD_COACH:
            await this.userAddCoach(message.data);
            break;
          default:
            console.warn(
              'Unhandled routing key for classRoom:',
              message.routingKey,
            );
        }
      } else {
        console.warn('Message not for assignment service:', message.routingKey);
      }
    });
  }
  private isRoutingKeyForService(
    routingKey: string,
    service: keyof typeof SERVICE_BINDINGS,
  ): boolean {
    return SERVICE_BINDINGS[service].includes(routingKey as never);
  }
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new RpcException(
      error
        ? error
        : {
            message,
            statusCode,
          },
    );
  }
  private async userAddCoach(input: { coachId: string; studentId: string }) {
    const { coachId, studentId } = input;
    try {
      await this.userModel.findByIdAndUpdate(coachId, {
        $addToSet: { coachedStudents: new Types.ObjectId(studentId) },
      });

      await this.userModel.findByIdAndUpdate(studentId, {
        coach: new Types.ObjectId(coachId),
      });
    } catch (error) {
      this.handleError(
        'Error saving user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
}
