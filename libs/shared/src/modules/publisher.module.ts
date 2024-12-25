import { Module } from '@nestjs/common';
import { SharedModule } from '../shared.module';
import { BroadcastPublisherService } from '../services/broadcast.publisher.service';


@Module({
  imports: [SharedModule.registerBroadcastExchange()],
  providers: [BroadcastPublisherService],
})
export class PublisherModule {}
