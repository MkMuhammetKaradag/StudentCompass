import { Inject, Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

export const ROUTING_KEYS = {
  USER_NEW: 'USER_NEW',
  USER_ADD_COACH: 'USER_ADD_COACH',
  USER_LIKE: 'USER_LIKE',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
} as const;

export const SERVICE_BINDINGS = {
  notification: [
    // ROUTING_KEYS.USER_NEW,
    ROUTING_KEYS.USER_LIKE,
    ROUTING_KEYS.CHAT_MESSAGE,
  ],
  user: [ROUTING_KEYS.USER_LIKE],
  chat: [ROUTING_KEYS.CHAT_MESSAGE],
  classRoom: [ROUTING_KEYS.USER_NEW],
  assignment: [ROUTING_KEYS.USER_ADD_COACH],
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
    callback: (msg: any) => Promise<void>,
  ) {
    const { channel, exchange } = this.consumerProvider;

    try {
      // Servis için özel kuyruk oluştur
      const queueName = `queue.${serviceName}`;
      const queueNameRetry = `queue.${serviceName}.retry`;
      const { queue } = await channel.assertQueue(queueName, {
        durable: true,
        exclusive: false,
      });
      await channel.assertQueue(queueNameRetry, {
        durable: true,
        deadLetterExchange: '', // Mesajın döneceği exchange (varsayılan exchange kullanılır)
        deadLetterRoutingKey: queueName, // Mesajın döneceği kuyruk
        messageTtl: 10000, // 10 saniye (ms cinsinden)
      });
      // Önceki binding'leri temizle
      await channel.unbindQueue(queue, exchange, '*');

      // Servis için tanımlı routing key'leri bağla
      const routingKeys = SERVICE_BINDINGS[serviceName];
      if (!routingKeys) {
        this.logger.warn(`No routing keys defined for service: ${serviceName}`);
        return;
      }
      for (const routingKey of routingKeys) {
        console.log('first', routingKey);
        await channel.bindQueue(queue, exchange, routingKey);
        this.logger.log(`Bound ${serviceName} to ${routingKey}`);
      }

      // Mesajları dinle
      await channel.consume(queue, async (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          if (!routingKeys.includes(routingKey as never)) {
            this.logger.warn(
              `Ignored message with unsupported routing key: ${routingKey}`,
            );
            channel.ack(msg);
            return;
          }

          this.logger.debug(
            `[${serviceName}] Received message with routing key: ${msg.fields.routingKey}`,
          );
          try {
            await callback(content);
            channel.ack(msg);
          } catch (error) {
            this.logger.error(
              `Error processing message: ${error.message}`,
              error,
            );
            const retryCount = msg.properties.headers['x-retry-count'] || 0;
            // Mesajı retry kuyruğuna yönlendir
            channel.sendToQueue(queueNameRetry, msg.content, {
              headers: {
                ...msg.properties.headers,
                'x-retry-count': retryCount + 1,
              },
            });
            channel.ack(msg); // Orijinal mesajı kuyruktan kaldır
            // channel.nack(msg, false, true); // Mesaj tekrar kuyruğa eklenir
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error setting up consumer for ${serviceName}:`, error);
      throw error;
    }
  }
}
