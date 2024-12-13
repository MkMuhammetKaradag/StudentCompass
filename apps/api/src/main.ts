import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { GraphQLError } from 'graphql';
import * as cookieParser from 'cookie-parser';
import { RedisService } from '@app/shared';
import * as session from 'express-session';
import { sessionConfig } from '@app/shared/config/redis.config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  // const redisService = app.get(RedisService);
  const SECRET = configService.get<string>('SESSION_SECRET');

  // // app.use(session(redisService.instance));
  app.use(cookieParser(SECRET));
  app.use(session(sessionConfig));
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.map(
          (error) =>
            `${error.property} has wrong value ${error.value}, ${Object.values(error.constraints).join(', ')}`,
        );

        return new GraphQLError(messages.join('-'), {
          extensions: {
            code: HttpStatus.BAD_REQUEST,
          },
        });
      },
    }),
  );
  app.enableCors({
    origin: ['http://localhost:5173'],
    allowedHeaders: [
      'Content-Type',
      'apollo-require-preflight',
      'Accept',
      'Authorization',
      'X-Requested-With',
    ],
    credentials: true,
  });
  const PORT = configService.get<number>('API_PORT');
  await app.listen(PORT);
}
bootstrap();
