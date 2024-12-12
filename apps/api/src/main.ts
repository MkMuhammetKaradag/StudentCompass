import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { GraphQLError } from 'graphql';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
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
