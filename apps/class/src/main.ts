import { NestFactory } from '@nestjs/core';
import { ClassModule } from './class.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(ClassModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  const port = configService.get('CLASS_PORT');
  app.connectMicroservice(sharedService.getRmqOptions('CLASSROOME'));
  app.connectMicroservice(sharedService.getRmqOptions('BROADCAST'));

  app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
