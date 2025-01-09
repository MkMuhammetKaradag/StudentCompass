import { NestFactory } from '@nestjs/core';
import { ChatModule } from './chat.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(ChatModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);

  app.connectMicroservice(sharedService.getRmqOptions('CHAT', false));
  app.connectMicroservice(sharedService.getRpcRmqOptions('CHAT'));
  app.connectMicroservice(sharedService.getRmqOptions('BROADCAST'));

  app.startAllMicroservices();
  const port = configService.get<number>('CHAT_PORT');
  await app.listen(port || 3006);
}
bootstrap();
