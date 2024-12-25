import { Inject, Injectable } from '@nestjs/common';
import * as amqp from 'amqplib';
@Injectable()
export class BroadcastPublisherService {
  constructor(
    @Inject('BROADCAST_EXCHANGE')
    private readonly exchangeProvider: {
      channel: amqp.Channel;
      exchange: string;
    },
  ) {}

  async publish(message: any) {
    const { channel, exchange } = this.exchangeProvider;
    channel.publish(exchange, '', Buffer.from(JSON.stringify(message)));
    console.log('Broadcast message published:', message);
  }
}
