import { NestFactory } from '@nestjs/core';
import { ChatModule } from './chat.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(ChatModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  try {
    await sharedService.setupRetryMechanism('CHAT');

    app.connectMicroservice(sharedService.getRmqOptions('CHAT'));
    app.connectMicroservice(sharedService.getRpcRmqOptions('CHAT'));

    app.connectMicroservice(sharedService.getRmqOptions('BROADCAST'));

    app.startAllMicroservices();
    const port = configService.get<number>('CHAT_PORT');
    console.log(port);
    await app.listen(port || 3006);
  } catch (error) {
    console.error('Error during bootstrap:', error);
    process.exit(1);
  }
}
bootstrap();
