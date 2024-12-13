import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  parseCookies,
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
    SharedModule.registerRmq('AUTH_SERVICE', 'AUTH'),
    SharedModule.registerRmq('EMAIL_SERVICE', 'EMAIL'),
    GraphQLModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      driver: ApolloDriver,
      useFactory: async (configService: ConfigService) => ({
        playground: true,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        uploads: false,

        context: ({ req, res, connection }) => {
          if (connection) {
            return { req: connection.context, res };
          }
          // console.log('app.module:', req.session);
          return { req, res, session: req.session };
          // return { req, res };
        },
        subscriptions: {
          'graphql-ws': true,
          // 'subscriptions-transport-ws': {
          //   onConnect: (connectionParams, webSocket, context) => {
          //     const cookieString = webSocket.upgradeReq.headers.cookie || '';
          //     const cookies = parseCookies(cookieString);

          //     if (Object.keys(cookies).length > 0) {
          //       return {
          //         req: {
          //           cookies: cookies,
          //         },
          //       };
          //     }
          //     throw new Error('Missing auth token!');
          //   },
          // },
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AuthResolver],
})
export class AppModule {}
