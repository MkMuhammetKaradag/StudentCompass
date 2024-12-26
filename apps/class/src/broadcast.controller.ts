import { User, UserDocument } from '@app/shared';
import {
  BroadcastConsumerService,
  ROUTING_KEYS,
  SERVICE_BINDINGS,
} from '@app/shared/services/broadcast.consumer.service';
import { Controller, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Controller('broadcast')
export class BroadcastController implements OnModuleInit {
  constructor(
    @InjectModel(User.name, 'classRoome')
    private readonly userModel: Model<UserDocument>,
    private readonly broadcastConsumer: BroadcastConsumerService,
  ) {}

  async onModuleInit() {
    await this.broadcastConsumer.consume('classRoom', (message) => {
      console.log('ClassRoom service received:', message);
      if (this.isRoutingKeyForService(message.routingKey, 'classRoom')) {
        switch (message.routingKey) {
          case ROUTING_KEYS.USER_NEW:
            this.savedUser(message.data);
            break;
          default:
            console.warn(
              'Unhandled routing key for classRoom:',
              message.routingKey,
            );
        }
      } else {
        console.warn('Message not for classRoom service:', message.routingKey);
      }
    });
  }
  private isRoutingKeyForService(
    routingKey: string,
    service: keyof typeof SERVICE_BINDINGS,
  ): boolean {
    return SERVICE_BINDINGS[service].includes(routingKey as never);
  }
  private async savedUser(input: User) {
    try {
      const user = new this.userModel({
        _id: input._id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        userName: input.userName,
        password: 'notification_service',
      });
      await user.save();
    } catch (error) {
      console.error(error);
    }
  }
}
