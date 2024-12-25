import { BroadcastConsumerService } from '@app/shared/services/broadcast.consumer.service';
import { Controller, OnModuleInit } from '@nestjs/common';

@Controller('broadcast')
export class BroadcastController implements OnModuleInit {
  constructor(private readonly broadcastConsumer: BroadcastConsumerService) {}

  async onModuleInit() {
    await this.broadcastConsumer.consume(
      (msg: { event: string; data: any }) => {
        if (msg.event === 'new-user') {
          console.log('New user created');
          this.savedUser();
        }
      },
    );
  }

  private savedUser() {
    console.log('savedUser runing');
  }

  //   @Get('consume')
  //   async consumeMessages() {
  //     await this.broadcastConsumer.consume((msg) => {
  //       console.log('Message received via Controller:', msg);
  //     });
  //     return { status: 'Consumer restarted and listening for messages' };
  //   }
}
