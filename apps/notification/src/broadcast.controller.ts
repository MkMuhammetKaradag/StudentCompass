import { BroadcastConsumerService } from '@app/shared/services/broadcast.consumer.service';
import { Controller, OnModuleInit } from '@nestjs/common';

@Controller('broadcast')
export class BroadcastController implements OnModuleInit {
  constructor(private readonly broadcastConsumer: BroadcastConsumerService) {}

  async onModuleInit() {
    // await this.broadcastConsumer.consume('notification', (message) => {
    //   console.log('User service received:', message);
    //   // İşlemlerinizi burada yapın
    // });
  }

  private savedUser(data: any) {
    console.log('savedUser runing', data);
  }

  //   @Get('consume')
  //   async consumeMessages() {
  //     await this.broadcastConsumer.consume((msg) => {
  //       console.log('Message received via Controller:', msg);
  //     });
  //     return { status: 'Consumer restarted and listening for messages' };
  //   }
}
