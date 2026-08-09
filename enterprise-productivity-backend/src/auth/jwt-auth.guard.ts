import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import type { User } from '../database/schema/users.schema';
import type { AuthObject } from './auth-object';

export interface JwtPayload {
  sub: string;
  username: string;
  name?: string;
  sessionId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly streamService: StreamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { auth?: AuthObject; user?: unknown }>();

    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid bearer token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Session has no resolvable user');
    }

    const user = await this.usersService.findByUsername(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }

    request.user = user;
    request.auth = { userId: user.username, sessionId: payload.sessionId };

    try {
      await this.streamService.syncUser(user);
    } catch (err) {
      this.logger.warn(`Stream user sync failed: ${String(err)}`);
    }

    return true;
  }
}