import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  CoachingRequest,
  CoachingRequestSchema,
  MongoDBModule,
  PasswordReset,
  PasswordResetSchema,
  PubSubModule,
  RedisModule,
  SharedModule,
  SharedService,
  User,
  UserSchema,
} from '@app/shared';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { JwtHelperService } from './jwtHelper.service';

@Module({
  imports: [
    RedisModule,
    PubSubModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '45m' },
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    SharedModule.registerRmq('EMAIL_SERVICE', 'EMAIL'),
    MongoDBModule.forRoot('AUTH', 'auth'),
    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema },
        { name: PasswordReset.name, schema: PasswordResetSchema },
      ],
      'auth',
    ),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtHelperService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class AuthModule {}
