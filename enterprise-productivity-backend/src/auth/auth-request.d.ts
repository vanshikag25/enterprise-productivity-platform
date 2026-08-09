import type { AuthObject } from './auth-object';
import type { User } from '../database/schema/users.schema';

declare module 'express' {
  interface Request {
    auth?: AuthObject;
    user?: User;
  }
}