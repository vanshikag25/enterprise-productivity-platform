import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { UsersService } from '../users/users.service';
import { StreamService } from '../stream/stream.service';
export declare class ClerkAuthGuard implements CanActivate {
    private readonly clerkService;
    private readonly usersService;
    private readonly streamService;
    private readonly logger;
    constructor(clerkService: ClerkService, usersService: UsersService, streamService: StreamService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private toFetchRequest;
}
