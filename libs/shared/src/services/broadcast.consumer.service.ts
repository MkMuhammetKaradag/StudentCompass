import { Inject, Injectable } from '@nestjs/common';
import * as amqp from 'amqplib';
@Injectable()
export class BroadcastConsumerService {
  constructor(
    @Inject('BROADCAST_EXCHANGE')
    private readonly consumerProvider: {
      channel: amqp.Channel;
      exchange: string;
    },
  ) {}

  async consume(callback: (msg: any) => void) {
    const { channel, exchange } = this.consumerProvider;

    const queue = await channel.assertQueue('', { exclusive: true }); // Geçici kuyruk
    await channel.bindQueue(queue.queue, exchange, '');

    channel.consume(queue.queue, (message) => {
      if (message !== null) {
        const content = JSON.parse(message.content.toString());
        // console.log('Broadcast message received:', content);

        // Gelen mesajı işlemeye yönlendirme
        callback(content);

        // Mesajı işlendikten sonra onayla
        channel.ack(message);
      }
    });
  }
}
