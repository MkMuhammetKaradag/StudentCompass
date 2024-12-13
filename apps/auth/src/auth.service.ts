import {
  ActivationUserInput,
  RedisService,
  SignInput,
  SignUpInput,
  User,
  UserDocument,
  UserRole,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GraphQLError } from 'graphql';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { JwtHelperService } from './jwtHelper.service';
const BCRYPT_SALT_ROUNDS = 12;
const ACTIVATION_CODE_LENGTH = 4;
const ACTIVATION_TOKEN_EXPIRY = '5m';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name, 'auth')
    private userModel: Model<UserDocument>, // AUTH veritabanından User modeli
    // private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly jwtHelper: JwtHelperService,
    private redisService: RedisService,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new GraphQLError(message, {
      extensions: {
        code: statusCode,
        error,
      },
    });
  }
  // async hashPassword(password: string): Promise<string> {
  //   try {
  //     return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  //   } catch (error) {
  //     this.handleError(
  //       'Failed to hash password',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //       error,
  //     );
  //   }
  // }
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
      console.log(error);
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
      // this.jwtService.signAsync(
      //   { user, activationCode },
      //   { expiresIn: ACTIVATION_TOKEN_EXPIRY },
      // );

      // await this.emailService.send({
      // email send micro service send
      // });

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
      return await user.save();
    } catch (error) {
      console.log(error);
      this.handleError(
        'Failed to activate user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  // async doesPasswordMatch(
  //   password: string,
  //   hashedPassword: string,
  // ): Promise<boolean> {
  //   return bcrypt.compare(password, hashedPassword);
  // }

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

    // this.jwtService.sign(payload, {
    //   secret: process.env.JWT_REFRESH_SECRET,
    //   expiresIn: '7d',
    // });
  }
  async signIn(loginUser: SignInput): Promise<{
    user: User;
    access_token: string;
    refresh_token: string;
  }> {
    const { email, password } = loginUser;
    try {
      const user = await this.validateUser(email, password);
      const payload = { email: user.email, sub: user._id, roles: user.roles };
      const access_token = await this.jwtHelper.signToken(payload);
      // const access_token = await this.jwtService.signAsync(payload);
      const refresh_token = this.generateRefreshToken(
        email,
        user._id,
        user.roles,
      );
      return { user, access_token, refresh_token };
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
}
