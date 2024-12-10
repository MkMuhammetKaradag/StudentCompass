import { Body, Controller, Get, Inject, Post, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
export class UserLoginInput {
  email: string;
  password: string;
}
@Controller()
export class AppController {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
    @Inject('EMAIL_SERVICE')
    private readonly emailService: ClientProxy,
  ) {}

  @Post('auth/login')
  async login(@Body() input: UserLoginInput, @Res() res: Response) {
    const data = await firstValueFrom<string>(
      this.authService.send(
        {
          cmd: 'login_user',
        },
        {
          ...input,
        },
      ),
    );

    // this.emailService.emit(
    //   {
    //     cmd: 'send_email',
    //   },
    //   {
    //     email: 'karadag2947@gmail.com',
    //     activation_code: '1234',
    //   },
    // );

    console.log('gelen data :', data);
    res.send({ data });
    return data;
  }
}
