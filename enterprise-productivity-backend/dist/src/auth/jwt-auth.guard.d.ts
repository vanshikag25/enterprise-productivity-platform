import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
export interface JwtPayload {
    sub: string;
    username: string;
    name?: string;
    sessionId?: string;
}
export declare class JwtAuthGuard implements CanActivate {
    private readonly jwtService;
    private readonly usersService;
    private readonly streamService;
    private readonly logger;
    constructor(jwtService: JwtService, usersService: UsersService, streamService: StreamService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
