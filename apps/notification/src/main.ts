import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  const port = configService.get('NOTIFICATION_PORT');
  app.connectMicroservice(sharedService.getRmqOptions('NOTIFICATION'));
  app.connectMicroservice(sharedService.getRmqOptions('BROADCAST'));

  app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
