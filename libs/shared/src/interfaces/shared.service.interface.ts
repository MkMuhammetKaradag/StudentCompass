import { RmqContext, RmqOptions } from '@nestjs/microservices';

export interface SharedServiceInterface {
  getRmqOptions(queueName: string, defaultPersistence: boolean): RmqOptions;
  acknowledgeMessage(context: RmqContext): void;
  nacknowledgeMessage(content: RmqContext): void;
  // onModuleInit(): any;
}
