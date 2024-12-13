import { UserRole } from '@app/shared/schemas/user.schema';

export interface AuthUser {
  _id: string;
  email: string;
  roles: UserRole[];
}
