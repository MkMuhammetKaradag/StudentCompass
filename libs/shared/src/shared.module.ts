import { DynamicModule, Inject, Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ClientProxyFactory,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';
import * as amqp from 'amqplib';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {
  static registerRmq(service: string, queueName: string): DynamicModule {
    const provider = {
      provide: service,
      useFactory: (configService: ConfigService) => {
        const USER = configService.get<string>('RABBITMQ_USER');
        const PASS = configService.get<string>('RABBITMQ_PASS');
        const HOST = configService.get<string>('RABBITMQ_HOST');
        const QUEUE = configService.get<string>(`RABBITMQ_${queueName}_QUEUE`);
        // const URI = configService.get<string>('RABBITMQ_URI');
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [`amqp://${USER}:${PASS}@${HOST}`],
            // urls: [URI],
            queue: QUEUE,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
      inject: [ConfigService],
    };
    return {
      module: SharedModule,
      providers: [provider],
      exports: [provider],
    };
  }
  static registerBroadcastExchange(): DynamicModule {
    const provider = {
      provide: 'BROADCAST_EXCHANGE',
      useFactory: async (configService: ConfigService) => {
        const USER = configService.get<string>('RABBITMQ_USER');
        const PASS = configService.get<string>('RABBITMQ_PASS');
        const HOST = configService.get<string>('RABBITMQ_HOST');

        const connection = await amqp.connect(`amqp://${USER}:${PASS}@${HOST}`);
        const channel = await connection.createChannel();

        const exchange = 'fanout_exchange';
        await channel.assertExchange(exchange, 'fanout', { durable: true });

        return { channel, exchange };
      },
      inject: [ConfigService],
    };

    return {
      module: SharedModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
