import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';

@Injectable()
export class JwtHelperService {
  constructor(private readonly jwtService: JwtService) {}

  async signToken(payload: any, options?: JwtSignOptions): Promise<string> {
    return this.jwtService.signAsync(payload, options);
  }
  sign(payload: any, options?: JwtSignOptions) {
    return this.jwtService.sign(payload, options);
  }
  async verifyToken(token: string, options?: JwtVerifyOptions): Promise<any> {
    return this.jwtService.verifyAsync(token, options);
  }
}
