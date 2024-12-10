import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  const port = configService.get('AUTH_PORT');
  app.connectMicroservice(sharedService.getRmqOptions('AUTH'));

  app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
