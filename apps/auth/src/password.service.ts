import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly BCRYPT_SALT_ROUNDS = 12;

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  async doesPasswordMatch(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
