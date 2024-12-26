import {
  ActivationUserInput,
  PasswordReset,
  PasswordResetDocument,
  PUB_SUB,
  SignInput,
  SignUpInput,
  User,
  UserDocument,
  UserRole,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { PasswordService } from './password.service';
import { JwtHelperService } from './jwtHelper.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RpcException } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { BroadcastPublisherService } from '@app/shared/services/broadcast.publisher.service';
const ACTIVATION_CODE_LENGTH = 4;
const ACTIVATION_TOKEN_EXPIRY = '5m';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name, 'auth')
    private userModel: Model<UserDocument>,
    @InjectModel(PasswordReset.name, 'auth')
    private passwordResetModel: Model<PasswordResetDocument>,
    private readonly passwordService: PasswordService,
    private readonly jwtHelper: JwtHelperService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    private readonly broadcastService: BroadcastPublisherService,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new RpcException({
      message,
      statusCode: HttpStatus.CONFLICT,
    });
  }

  private async findUserByEmail(
    email: string,
    userName?: string,
  ): Promise<User | null> {
    const user = await this.userModel.findOne({
      $or: [
        {
          email: email,
        },
        { userName: userName },
      ],
    });
    return user;
  }
  private async checkExistingUser(
    email: string,
    userName: string,
  ): Promise<void> {
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      this.handleError(
        'An account with that email already exists!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  async signUp(registerUser: SignUpInput) {
    const { email, password, userName } = registerUser;
    try {
      await this.checkExistingUser(email, userName);
      const hashedPassword = await this.passwordService.hashPassword(password);
      const userWithHashedPassword = {
        ...registerUser,
        password: hashedPassword,
      };
      const activationToken = await this.createActivateToken(
        userWithHashedPassword,
      );
      return { activationToken };
    } catch (error) {
      this.handleError(
        'Failed to register user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  private generateActivationCode(): string {
    return Math.floor(Math.random() * 10 ** ACTIVATION_CODE_LENGTH)
      .toString()
      .padStart(ACTIVATION_CODE_LENGTH, '0');
  }
  async createActivateToken(user: SignUpInput) {
    try {
      const activationCode = this.generateActivationCode();
      const token = await this.jwtHelper.signToken(
        { user, activationCode },
        { expiresIn: ACTIVATION_TOKEN_EXPIRY },
      );

      console.log(activationCode);
      return token;
    } catch (error) {
      this.handleError(
        'Failed to create activation token',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async activationUser(activationUser: ActivationUserInput) {
    const { activationCode, activationToken } = activationUser;
    try {
      const activationData: {
        user: SignUpInput;
        activationCode: string;
      } = await this.jwtHelper.verifyToken(activationToken);
      // await this.jwtService.verifyAsync(activationToken);

      if (activationData.activationCode !== activationCode) {
        this.handleError('Invalid activation code', HttpStatus.BAD_REQUEST);
      }

      await this.checkExistingUser(
        activationData.user.email,
        activationData.user.userName,
      );

      const user = new this.userModel(activationData.user);
      const savedUser = await user.save();
      this.broadcastEvent('', '');
      return savedUser;
    } catch (error) {
      console.log(error);
      this.handleError(
        'Failed to activate user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async validateUser(email: string, password: string): Promise<User> {
    try {
      const existingUser = await this.findUserByEmail(email);
      if (!existingUser) {
        this.handleError(
          'An account with that email already exists!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const doesPasswordMatch = await this.passwordService.doesPasswordMatch(
        password,
        existingUser.password,
      );

      if (!doesPasswordMatch) {
        this.handleError('Invalid credentials!', HttpStatus.UNAUTHORIZED);
      }
      return existingUser;
    } catch (error) {
      this.handleError(
        'Failed to validate user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  private generateRefreshToken(
    email: string,
    userId: string,
    roles: UserRole[],
  ): string {
    const payload = { email, sub: userId, roles };
    return this.jwtHelper.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
  }
  async signIn(loginUser: SignInput): Promise<User> {
    const { email, password } = loginUser;
    try {
      const user = await this.validateUser(email, password);
      const payload = { email: user.email, sub: user._id, roles: user.roles };
      // const access_token = await this.jwtHelper.signToken(payload);
      // const access_token = await this.jwtService.signAsync(payload);
      // const refresh_token = this.generateRefreshToken(
      //   email,
      //   user._id,
      //   user.roles,
      // );
      // return { user, access_token, refresh_token };
      return user;
    } catch (error) {
      this.handleError(
        'Failed to login user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async verifyAcccessToken(jwt: string) {
    if (!jwt) {
      this.handleError('Invalid credentials!', HttpStatus.UNAUTHORIZED);
    }
    try {
      const { email, sub, exp, roles } = await this.jwtHelper.verifyToken(jwt);

      return {
        user: {
          _id: sub,
          email: email,
          roles: roles,
        },
        exp,
      };
    } catch (error) {
      this.handleError(
        'Failed to verift accesstoken',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtHelper.verifyToken(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      console.log('access token için girdi');

      const user = await this.userModel
        .findById(payload.sub)
        .select('email _id roles');

      if (!user) {
        this.handleError('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      }
      const access_token = await this.jwtHelper.signToken({
        email: user.email,
        sub: user._id,
        roles: user.roles,
      });
      return {
        user: {
          _id: user._id,
          email: user.email,
          roles: user.roles,
        },
        access_token,
      };
    } catch (error) {
      this.handleError(
        'Failed to verift accesstoken',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async changeUserStatus(input: { userId: string; status: boolean }) {
    try {
      const user = await this.userModel.findById(input.userId);
      if (!user) {
        this.handleError('Invalid user id', HttpStatus.UNAUTHORIZED);
      }
      user.status = input.status;
      await user.save();

      this.pubSub.publish('changeUserStatus', {
        changeUserStatus: {
          userId: input.userId,
          status: input.status,
        },
      });
      return true;
    } catch (error) {
      this.handleError(
        'Failed to change user status',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async generateForgotPasswordLink(userId: string): Promise<string> {
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000);
    const passwordReset = new this.passwordResetModel({
      user: userId,
      token: resetToken,
      expiresAt,
    });

    await passwordReset.save();

    return resetToken;
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await this.findUserByEmail(email);

    if (!user) {
      this.handleError('User Not Found', HttpStatus.NOT_FOUND);
    }
    try {
      const forgotPasswordToken = await this.generateForgotPasswordLink(
        user._id,
      );

      console.log(forgotPasswordToken);

      return `Your forgot password request succesful!`;
    } catch (error) {
      this.handleError(
        'Failed to orgot Password',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async resetPassword(password: string, token: string): Promise<String> {
    const passwordReset = await this.passwordResetModel.findOne({ token });

    if (!passwordReset || passwordReset.expiresAt < new Date()) {
      this.handleError('Invalid or expired token', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userModel.findById(passwordReset.user);
    if (!user) {
      this.handleError('User Not Found', HttpStatus.NOT_FOUND);
    }

    user.password = await this.passwordService.hashPassword(password);
    await user.save();
    await this.passwordResetModel.findByIdAndDelete(passwordReset._id);

    return 'Password successfully reset';
  }

  async broadcastEvent(event: string, data: any) {
    this.broadcastService.publish('', {
      event,
      data,
    });
  }
}
