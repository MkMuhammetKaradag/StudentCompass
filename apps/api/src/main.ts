import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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
