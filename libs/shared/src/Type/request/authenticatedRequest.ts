import { Request } from 'express';
import { AuthUser } from './user';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
