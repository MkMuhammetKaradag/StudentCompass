import { Controller, Get, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SharedService } from '@app/shared';
import {
  ClientProxy,
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
export class LoginUserInput {
  email: string;

  password: string;
}
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('EMAIL_SERVICE')
    private readonly emailService: ClientProxy,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @MessagePattern({
    cmd: 'login_user',
  })
  async loginUser(
    @Ctx() context: RmqContext,
    @Payload() loginUser: LoginUserInput,
  ) {
    console.log('kuyruk çalıştı geldi');

    this.emailService.emit(
      {
        cmd: 'send_email',
      },
      {
        email: 'test@test.com',
        activation_code: '3214',
      },
    );
    this.sharedService.acknowledgeMessage(context);
    console.log('return ');
    // const data = this.authService.loginUser(loginUser);
    return 'data';
  }
}
