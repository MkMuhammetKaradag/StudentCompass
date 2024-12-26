import { Inject, Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ROUTING_KEYS } from './broadcast.consumer.service';
@Injectable()
export class BroadcastPublisherService {
  private readonly logger = new Logger(BroadcastPublisherService.name);
  constructor(
    @Inject('BROADCAST_EXCHANGE')
    private readonly publisherProvider: {
      channel: amqp.Channel;
      exchange: string;
    },
  ) {}

  async broadcast(routingKey: keyof typeof ROUTING_KEYS, data: any) {
    const { channel, exchange } = this.publisherProvider;

    try {
      const message = {
        data,
        timestamp: new Date().toISOString(),
      };

      await channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          deliveryMode: 2,
        },
      );

      this.logger.debug(`Published message with routing key: ${routingKey}`);
      return true;
    } catch (error) {
      this.logger.error(`Error publishing message:`, error);
      throw error;
    }
  }
}
