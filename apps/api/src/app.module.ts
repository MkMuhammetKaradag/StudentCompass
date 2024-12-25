import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  parseCookies,
  PubSubModule,
  RedisModule,
  RedisService,
  SharedModule,
} from '@app/shared';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AuthResolver } from './resolvers/auth.resolver';
import { WinstonModule, utilities } from 'nest-winston';
import * as winston from 'winston';
import { StudentResolver } from './resolvers/student.resolver';
import { CoachResolver } from './resolvers/coach.resolver';
import { NotificationResolver } from './resolvers/notification.resolver';
import { ClassRoomeResolver } from './resolvers/classRoome.resolver';
import { BroadcastPublisherService } from '@app/shared/services/broadcast.publisher.service';
@Module({
  imports: [
    RedisModule,
    PubSubModule,
    SharedModule.registerRmq('AUTH_SERVICE', 'AUTH'),
    SharedModule.registerRmq('USER_SERVICE', 'USER'),
    SharedModule.registerRmq('EMAIL_SERVICE', 'EMAIL'),
    SharedModule.registerRmq('CLASSROOME_SERVICE', 'CLASSROOME'),
    SharedModule.registerRmq('NOTIFICATION_SERVICE', 'NOTIFICATION'),
    SharedModule.registerBroadcastExchange(),
    GraphQLModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, RedisService],

      driver: ApolloDriver,
      useFactory: async (
        configService: ConfigService,
        redisService: RedisService,
      ) => ({
        playground: true,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        uploads: false,

        context: ({ req, res, connection }) => {
          if (connection) {
            return { req: connection.context, res };
          }
          // console.log('app.module:', req.session);
          return { req, res };
          // return { req, res };
        },
        subscriptions: {
          'graphql-ws': true,
          'subscriptions-transport-ws': {
            onConnect: async (connectionParams, webSocket, context) => {
              const cookieString = webSocket.upgradeReq.headers.cookie || '';
              const cookies = parseCookies(cookieString);
              const userAgent =
                webSocket.upgradeReq.headers['user-agent'] || '';

              const sessionId = cookies.session_id;

              if (sessionId && userAgent) {
                return {
                  req: {
                    cookies: cookies,
                  },
                  session: sessionId || null,
                };
              }
              throw new Error('Missing auth token!');
            },
          },
        },
      }),
    }),

    WinstonModule.forRoot({
      transports: [
        // 1. Konsol Transport'u
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(), // Zaman damgası ekle
            winston.format.colorize(), // Seviyelere renk kat
            utilities.format.nestLike(), // NestJS benzeri log formatı
          ),
        }),

        // 2. Dosya Transport'u (info seviyesinde loglar)
        new winston.transports.File({
          filename: 'logs/application.log',
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(), // Logları JSON formatında tutar
          ),
        }),

        // 3. Hata logları için ayrı dosya
        new winston.transports.File({
          filename: 'logs/errors.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    // BroadcastConsumerService,
    BroadcastPublisherService,
    AppService,
    AuthResolver,
    StudentResolver,
    CoachResolver,
    NotificationResolver,
    ClassRoomeResolver,
  ],
})
export class AppModule {}
