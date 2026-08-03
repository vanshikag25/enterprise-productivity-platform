import { SetMetadata } from '@nestjs/common';
import { UserRole } from './roles';

export const ROLES_KEY = 'roles';

/**
 * Marks a handler with the minimum role required to access it. Access is
 * granted when the authenticated user's role rank is equal to or higher than
 * the lowest-ranked required role. Omit the decorator to allow any
 * authenticated user.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
