import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { User } from '../database/schema/users.schema';
import { ROLES_KEY } from './roles.decorator';
import { hasMinRole, type UserRole } from './roles';

/**
 * Enforces @Roles metadata against the DB user row attached to the request by
 * JwtAuthGuard. Must run after JwtAuthGuard in the guard chain.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Role information is unavailable');
    }

    const allowed = requiredRoles.some((min) => hasMinRole(user.role, min));
    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
