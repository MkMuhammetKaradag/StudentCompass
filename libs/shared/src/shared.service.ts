import { Injectable } from '@nestjs/common';
import { SharedServiceInterface } from './interfaces/shared.service.interface';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';
import * as amqp from 'amqplib';
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
    const RETRY_QUEUE = `${QUEUE}_retry`;
    const DEAD_LETTER_EXCHANGE = `${QUEUE}_dlx`;
    const RETRY_EXCHANGE = `${QUEUE}_retry_exchange`;
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
          arguments: {
            'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
            'x-dead-letter-routing-key': RETRY_QUEUE,
          },
        },
      },
    };
  }

  async setupRetryMechanism(queueName: string) {
    const USER = this.configService.get<string>('RABBITMQ_USER');
    const PASS = this.configService.get<string>('RABBITMQ_PASS');
    const HOST = this.configService.get<string>('RABBITMQ_HOST');

    const connection = await amqp.connect(`amqp://${USER}:${PASS}@${HOST}`);
    const channel = await connection.createChannel();

    const QUEUE = this.configService.get<string>(`RABBITMQ_${queueName}_QUEUE`);
    const RETRY_QUEUE = `${QUEUE}_retry`;
    const DEAD_LETTER_EXCHANGE = `${QUEUE}_dlx`;
    const RETRY_EXCHANGE = `${QUEUE}_retry_exchange`;

    // Setup exchanges
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', {
      durable: true,
    });
    await channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });

    // Setup retry queue with delay
    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': RETRY_EXCHANGE,
        'x-dead-letter-routing-key': QUEUE,
        'x-message-ttl': 3000, // 3 seconds delay
      },
    });

    // Bind queues to exchanges
    await channel.bindQueue(RETRY_QUEUE, DEAD_LETTER_EXCHANGE, RETRY_QUEUE);
    await channel.bindQueue(QUEUE, RETRY_EXCHANGE, QUEUE);

    await channel.close();
    await connection.close();
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
  async nacknowledgeMessage(
    context: RmqContext,
    retryCount: number = 0,
  ): Promise<void> {
    // const channel = context.getChannelRef();
    // const message = context.getMessage();
    // channel.nack(message);
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    const maxRetries = 5; // Maximum number of retry attempts

    const currentRetryCount = retryCount;

    if (currentRetryCount >= maxRetries) {
      channel.ack(originalMessage);
      console.log(
        `Message failed after ${maxRetries} retries:`,
        originalMessage,
      );
      return;
    }

    // const messageContent = originalMessage.content;
    // const messageProperties = originalMessage.properties;

    // // Create new message properties with updated retry count
    // const newProperties = {
    //   ...messageProperties,
    //   headers: {
    //     ...messageProperties.headers,
    //     'x-retry-count': currentRetryCount,
    //   },
    // };

    // try {
    //   // Publish the message to the dead letter exchange with updated headers
    //   const QUEUE = originalMessage.fields.routingKey;
    //   const DEAD_LETTER_EXCHANGE = `${QUEUE}_dlx`;
    //   const RETRY_QUEUE = `${QUEUE}_retry`;

    //   await channel.publish(
    //     DEAD_LETTER_EXCHANGE,
    //     RETRY_QUEUE,
    //     messageContent,
    //     newProperties,
    //   );

    //   // Acknowledge the original message after republishing
    //   channel.ack(originalMessage);
    // } catch (error) {
    //   console.error('Error republishing message:', error);
    //   // If republishing fails, reject the original message
    channel.reject(originalMessage, false);
    // }
  }
}
