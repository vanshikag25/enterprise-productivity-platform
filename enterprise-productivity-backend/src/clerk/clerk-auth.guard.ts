import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthObject } from '@clerk/backend';
import { ClerkService } from './clerk.service';
import { UsersService } from '../users/users.service';
import { StreamService } from '../stream/stream.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly clerkService: ClerkService,
    private readonly usersService: UsersService,
    private readonly streamService: StreamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const fetchRequest = this.toFetchRequest(request);

    const requestState = await this.clerkService
      .getClient()
      .authenticateRequest(fetchRequest);

    if (!requestState.isSignedIn) {
      this.logger.debug(JSON.stringify(requestState, null, 2));
      throw new UnauthorizedException('Invalid or missing session');
    }

    const auth: AuthObject = requestState.toAuth();
    request.auth = auth;

    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }

    const clerkUser = await this.clerkService
      .getClient()
      .users.getUser(auth.userId);

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress;

    if (!primaryEmail) {
      this.logger.error(
        `Clerk user ${auth.userId} has no resolvable primary email.`,
      );
      throw new UnauthorizedException('User has no verified email');
    }

    const savedUser = await this.usersService.upsertUser({
      clerkId: clerkUser.id,
      email: primaryEmail,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    });

    request.user = savedUser;

    await this.streamService.syncUser(savedUser);

    return true;
  }

  private toFetchRequest(req: Request): globalThis.Request {
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      }
    }

    return new globalThis.Request(url, {
      method: req.method,
      headers,
    });
  }
}
