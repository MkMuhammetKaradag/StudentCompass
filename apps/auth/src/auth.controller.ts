import { Controller, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ActivationUserInput,
  AuthCommands,
  SharedService,
  SignInput,
  SignUpInput,
} from '@app/shared';
import {
  ClientProxy,
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('EMAIL_SERVICE')
    private readonly emailService: ClientProxy,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  /**
   * Handle the message and process the business logic.
   * Automatically acknowledges the message.
   */
  private async handleMessage<T>(
    context: RmqContext,
    handler: () => Promise<T>,
  ): Promise<T> {
    try {
      // Acknowledge the message
      this.sharedService.acknowledgeMessage(context);

      // Execute the handler and return the result
      return await handler();
    } catch (error) {
      // Log error and rethrow to propagate it back to the message broker
      console.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Handle user signup.
   */
  @MessagePattern({ cmd: AuthCommands.SIGN_UP })
  async signUp(@Ctx() context: RmqContext, @Payload() input: SignUpInput) {
    return this.handleMessage(context, () => this.authService.signUp(input));
  }
  /**
   * Handle user signin.
   */
  @MessagePattern({ cmd: AuthCommands.SIGN_IN })
  async signIn(@Ctx() context: RmqContext, @Payload() input: SignInput) {
    return this.handleMessage(context, () => this.authService.signIn(input));
  }

  /**
   * Handle user activation.
   */
  @MessagePattern({ cmd: AuthCommands.ACTIVATE_USER })
  async activationUser(
    @Ctx() context: RmqContext,
    @Payload() input: ActivationUserInput,
  ) {
    return this.handleMessage(context, () =>
      this.authService.activationUser(input),
    );
  }

  @MessagePattern({ cmd: AuthCommands.VERIFY_ACCESS_TOKEN })
  async verifyAcccessToken(
    @Ctx() context: RmqContext,
    @Payload() input: string,
  ) {
    return this.handleMessage(context, () =>
      this.authService.verifyAcccessToken(input),
    );
  }
  @MessagePattern({ cmd: AuthCommands.REFRESH_ACCESS_TOKEN })
  async refreshAccessToken(
    @Ctx() context: RmqContext,
    @Payload() input: string,
  ) {
    return this.handleMessage(context, () =>
      this.authService.refreshAccessToken(input),
    );
  }

  @MessagePattern({ cmd: AuthCommands.CHANGE_USER_STATUS })
  async changeUserStatus(@Ctx() context: RmqContext, @Payload() input: {
    userId: string
    status: boolean
  }) {
    return this.handleMessage(context, () =>
      this.authService.changeUserStatus(input),
    );
  }
}
