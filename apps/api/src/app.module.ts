import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from '@app/shared';

@Module({
  imports: [
    SharedModule.registerRmq('AUTH_SERVICE', 'AUTH'),
    SharedModule.registerRmq('EMAIL_SERVICE', 'EMAIL'),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
