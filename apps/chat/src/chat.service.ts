import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ChatService {
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new RpcException({
      message,
      statusCode: statusCode,
      error: error,
    });
  }

  async CreateChatClassRoom(input: any) {
    try {
      throw Error('any');
      console.log(input);
    } catch (error) {
      this.handleError('any erro', HttpStatus.BAD_GATEWAY, error);
    }
  }
}
