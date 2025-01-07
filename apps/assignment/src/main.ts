import { NestFactory } from '@nestjs/core';
import { AssignmentModule } from './assignment.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(AssignmentModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  // const port = configService.get('ASSIGNMENT_PORT');
  app.connectMicroservice(sharedService.getRmqOptions('ASSIGNMENT', false));
  app.connectMicroservice(sharedService.getRmqOptions('WEEKLY_PLAN', false));
  app.connectMicroservice(sharedService.getRmqOptions('TASK', false));
  app.connectMicroservice(sharedService.getRpcRmqOptions('ASSIGNMENT'));
  app.connectMicroservice(sharedService.getRpcRmqOptions('WEEKLY_PLAN'));
  app.connectMicroservice(sharedService.getRpcRmqOptions('TASK'));
  app.connectMicroservice(sharedService.getRmqOptions('BROADCAST'));

  app.startAllMicroservices();
  const PORT = configService.get<number>('ASSIGNMENT_PORT');
  await app.listen(PORT || 3005);
}
bootstrap();
