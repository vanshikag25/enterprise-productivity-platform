import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { UserRole } from '../rbac/roles';
import { BCRYPT_ROUNDS } from './auth.service';

export const DEMO_ADMIN = {
  username: 'superadmin',
  password: 'SuperAdmin@123',
  email: 'superadmin@enterprise.local',
  firstName: 'Super',
  lastName: 'Admin',
};

/**
 * Ensures there is always a known-good login for the application: a Super Admin
 * with a password. When a Super Admin already exists (from the Clerk era) their
 * existing account is preserved and only given the demo password, so all
 * existing users, roles and data keep working.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const existing = await this.usersService.findByUsername(DEMO_ADMIN.username);

      if (existing) {
        if (!existing.passwordHash) {
          const passwordHash = await bcrypt.hash(DEMO_ADMIN.password, BCRYPT_ROUNDS);
          await this.usersService.updatePassword(existing.username, passwordHash);
          this.logger.log(
            `Seeded demo password for existing account "${existing.username}"`,
          );
        }
        return;
      }

      const passwordHash = await bcrypt.hash(DEMO_ADMIN.password, BCRYPT_ROUNDS);
      await this.usersService.createUser({
        username: DEMO_ADMIN.username,
        email: DEMO_ADMIN.email,
        passwordHash,
        firstName: DEMO_ADMIN.firstName,
        lastName: DEMO_ADMIN.lastName,
        role: UserRole.SUPER_ADMIN,
      });
      this.logger.log('Seeded demo Super Admin account');
    } catch (err) {
      this.logger.error(
        `Failed to seed demo admin: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}