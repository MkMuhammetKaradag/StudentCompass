import { Inject, Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

export const ROUTING_KEYS = {
  USER_NEW: 'USER_NEW',
  USER_LIKE: 'USER_LIKE',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
} as const;

export const SERVICE_BINDINGS = {
  notification: [
    ROUTING_KEYS.USER_NEW,
    ROUTING_KEYS.USER_LIKE,
    ROUTING_KEYS.CHAT_MESSAGE,
  ],
  user: [ROUTING_KEYS.USER_NEW],
  chat: [ROUTING_KEYS.CHAT_MESSAGE],
} as const;

@Injectable()
export class BroadcastConsumerService {
  private readonly logger = new Logger(BroadcastConsumerService.name);
  constructor(
    @Inject('BROADCAST_EXCHANGE')
    private readonly consumerProvider: {
      channel: amqp.Channel;
      exchange: string;
    },
  ) {}

  async consume(
    serviceName: keyof typeof SERVICE_BINDINGS,
    callback: (msg: any) => void,
  ) {
    const { channel, exchange } = this.consumerProvider;

    try {
      // Servis için özel kuyruk oluştur
      const queueName = `queue.${serviceName}`;
      const { queue } = await channel.assertQueue(queueName, {
        durable: true,
        exclusive: false,
      });

      // Önceki binding'leri temizle
      await channel.unbindQueue(queue, exchange, '*');

      // Servis için tanımlı routing key'leri bağla
      const routingKeys = SERVICE_BINDINGS[serviceName];
      for (const routingKey of routingKeys) {
        await channel.bindQueue(queue, exchange, routingKey);
        this.logger.log(`Bound ${serviceName} to ${routingKey}`);
      }

      // Mesajları dinle
      await channel.consume(queue, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          this.logger.debug(
            `[${serviceName}] Received message with routing key: ${msg.fields.routingKey}`,
          );
          callback(content);
          channel.ack(msg);
        }
      });
    } catch (error) {
      this.logger.error(`Error setting up consumer for ${serviceName}:`, error);
      throw error;
    }
  }

  // async consumeEvents(
  //   serviceName: keyof typeof EventPatterns,
  //   messageHandler: (routingKey: string, data: any) => void,
  // ) {
  //   const { channel, exchange } = this.consumerProvider;

  //   // Servis için kalıcı kuyruk oluştur
  //   const queueName = `broadcast_queue_${serviceName.toLowerCase()}`;
  //   console.log(queueName);
  //   const queue = await channel.assertQueue(queueName, {
  //     durable: true,
  //     exclusive: false,
  //   });

  //   // Servisin dinlemesi gereken tüm pattern'ları bind et
  //   for (const pattern of EventPatterns[serviceName]) {
  //     console.log(pattern);
  //     await channel.bindQueue(queue.queue, exchange, pattern);
  //   }

  //   // Mesajları dinle
  //   channel.consume(queue.queue, (message) => {
  //     if (message !== null) {
  //       const content = JSON.parse(message.content.toString());
  //       // Routing key ve data'yı handler'a gönder
  //       messageHandler(message.fields.routingKey, content.data);
  //       channel.ack(message);
  //     }
  //   });
  // }
}
