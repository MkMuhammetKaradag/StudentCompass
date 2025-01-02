import { Injectable } from '@nestjs/common';
import { SharedServiceInterface } from './interfaces/shared.service.interface';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class SharedService implements SharedServiceInterface {
  constructor(private readonly configService: ConfigService) {}

  getRmqOptions(
    queueName: string,
    defaultPersistence: boolean = true,
  ): RmqOptions {
    const USER = this.configService.get<string>('RABBITMQ_USER');
    const PASS = this.configService.get<string>('RABBITMQ_PASS');
    const HOST = this.configService.get<string>('RABBITMQ_HOST');
    const QUEUE = this.configService.get<string>(`RABBITMQ_${queueName}_QUEUE`);
    // const URI = this.configService.get<string>('RABBITMQ_URI');

    return {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${USER}:${PASS}@${HOST}`],
        // urls: [URI],
        queue: QUEUE,
        noAck: false,
        persistent: defaultPersistence,
        queueOptions: {
          durable: true,
        },
      },
    };
  }
  getRpcRmqOptions(queueName: string): RmqOptions {
    const USER = this.configService.get<string>('RABBITMQ_USER');
    const PASS = this.configService.get<string>('RABBITMQ_PASS');
    const HOST = this.configService.get<string>('RABBITMQ_HOST');
    const QUEUE = this.configService.get<string>(
      `RABBITMQ_${queueName}_RPC_QUEUE`,
    );
    // const URI = this.configService.get<string>('RABBITMQ_URI');

    return {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${USER}:${PASS}@${HOST}`],
        // urls: [URI],
        queue: QUEUE,
        noAck: false,
        queueOptions: {
          durable: false,
          autoDelete: true,
          expires: 1000,
          messageTtl: 1000,
        },
      },
    };
  }
  acknowledgeMessage(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
  }
  nacknowledgeMessage(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.nack(message);
  }
}
