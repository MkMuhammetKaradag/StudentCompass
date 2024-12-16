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
@Module({
  imports: [
    RedisModule,
    PubSubModule,
    SharedModule.registerRmq('AUTH_SERVICE', 'AUTH'),
    SharedModule.registerRmq('EMAIL_SERVICE', 'EMAIL'),
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
              // console.log(webSocket.upgradeReq.headers);
              const cookieString = webSocket.upgradeReq.headers.cookie || '';
              const cookies = parseCookies(cookieString);
              const userAgent =
                webSocket.upgradeReq.headers['user-agent'] || '';
              // console.log( webSocket.upgradeReq.headers['user-agent'] || '');
              // if (cookies.session_id) {
              //   const session = await redisService.get(
              //     `sess:${cookies.session_id || 'null'}`,
              //   );
              // }

              const sessionId = cookies.session_id;
              // console.log(userAgent);
              if (sessionId && userAgent) {
                // const session = await redisService.getSession(
                //   sessionId,
                //   userAgent,
                // );
                // console.log(session);
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
  ],
  controllers: [AppController],
  providers: [AppService, AuthResolver],
})
export class AppModule {}
