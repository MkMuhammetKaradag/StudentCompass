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
  static registerRmq(
    service: string,
    queueName: string,
    defaultPersistence: boolean = true,
  ): DynamicModule {
    const provider = {
      provide: service,
      useFactory: (configService: ConfigService) => {
        const USER = configService.get<string>('RABBITMQ_USER');
        const PASS = configService.get<string>('RABBITMQ_PASS');
        const HOST = configService.get<string>('RABBITMQ_HOST');
        const QUEUE = configService.get<string>(`RABBITMQ_${queueName}_QUEUE`);
        // const URI = configService.get<string>('RABBITMQ_URI');

        const RETRY_QUEUE = `${QUEUE}_retry`;
        const DEAD_LETTER_EXCHANGE = `${QUEUE}_dlx`;
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [`amqp://${USER}:${PASS}@${HOST}`],
            // urls: [URI],
            queue: QUEUE,
            persistent: defaultPersistence, // Varsayılan kalıcılık ayarı

            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
                'x-dead-letter-routing-key': RETRY_QUEUE,
              },
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

  static registerRpcClient(service: string, queueName: string): DynamicModule {
    const provider = {
      provide: `${service}_RPC`,
      useFactory: (configService: ConfigService) => {
        const USER = configService.get<string>('RABBITMQ_USER');
        const PASS = configService.get<string>('RABBITMQ_PASS');
        const HOST = configService.get<string>('RABBITMQ_HOST');
        const QUEUE = configService.get<string>(
          `RABBITMQ_${queueName}_RPC_QUEUE`,
        );

        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [`amqp://${USER}:${PASS}@${HOST}`],
            queue: QUEUE,
            queueOptions: {
              durable: false,
              autoDelete: true,
              expires: 1000,
              messageTtl: 1000,
            },
            noAssert: true,
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

        const exchange = 'broadcast.topic.exchange';
        await channel.assertExchange(exchange, 'topic', { durable: true });

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
