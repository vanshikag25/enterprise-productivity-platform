import {
  Inject,
  Injectable,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { users, User } from '../database/schema/users.schema';
import { isSupportedLanguage } from '../languages';
import { UserSortField, SortOrder } from './dto/list-users-query.dto';
import { ROLE_RANK, UserRole } from '../rbac/roles';
import { AuditService } from '../audit/audit.service';

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  role?: UserRole;
}

export interface FindUsersParams {
  search?: string;
  page: number;
  limit: number;
  sortBy: UserSortField;
  sortOrder: SortOrder;
}

export interface FindUsersResult {
  items: User[];
  total: number;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly auditService: AuditService,
  ) {}

  async findByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async findAllExcept(username: string): Promise<User[]> {
    return this.db.select().from(users).where(ne(users.username, username));
  }

  async count(): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(users);
    return row?.n ?? 0;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await this.findByUsername(input.username);
    if (existing) {
      throw new ConflictException(
        'An account with that username already exists.',
      );
    }
    const existingEmail = await this.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictException('An account with that email already exists.');
    }

    const [user] = await this.db
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        imageUrl: input.imageUrl ?? null,
        ...(input.role ? { role: input.role } : {}),
      })
      .returning();

    return user;
  }

  async updatePassword(username: string, passwordHash: string): Promise<User> {
    const [updated] = await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.username, username))
      .returning();
    if (!updated) throw new ForbiddenException('User profile not found');
    return updated;
  }

  async changeUsername(
    currentUsername: string,
    newUsername: string,
  ): Promise<User> {
    const username = newUsername.trim();

    if (username === currentUsername) {
      throw new ConflictException(
        'New username is the same as the current one.',
      );
    }

    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException(
        'An account with that username already exists.',
      );
    }

    try {
      const [updated] = await this.db
        .update(users)
        .set({ username, updatedAt: new Date() })
        .where(eq(users.username, currentUsername))
        .returning();
      if (!updated) throw new ForbiddenException('User profile not found');
      return updated;
    } catch (err) {
      // Race with another signup/rename hitting the unique constraint.
      const reason = (err as { code?: string })?.code;
      if (reason === '23505') {
        throw new ConflictException(
          'An account with that username already exists.',
        );
      }
      throw err;
    }
  }

  async removeUser(actor: User, targetUsername: string): Promise<void> {
    if (actor.username === targetUsername) {
      throw new ForbiddenException('You cannot remove your own account.');
    }

    const target = await this.findByUsername(targetUsername);
    if (!target) {
      throw new ForbiddenException('User not found');
    }

    const [removed] = await this.db
      .delete(users)
      .where(eq(users.username, targetUsername))
      .returning({ username: users.username });

    if (!removed) throw new ForbiddenException('User not found');
  }

  async updateProfile(
    username: string,
    patch: {
      firstName?: string | null;
      lastName?: string | null;
      imageUrl?: string | null;
      preferredLanguage?: string;
    },
  ): Promise<User> {
    let preferredLanguage: string | undefined;
    if (patch.preferredLanguage !== undefined) {
      const language = patch.preferredLanguage.trim().toLowerCase();
      if (!isSupportedLanguage(language)) {
        throw new BadRequestException(
          `Unsupported preferred language "${patch.preferredLanguage}".`,
        );
      }
      preferredLanguage = language;
    }
    const [updated] = await this.db
      .update(users)
      .set({
        ...(patch.firstName !== undefined
          ? { firstName: patch.firstName }
          : {}),
        ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
        ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
        ...(preferredLanguage !== undefined ? { preferredLanguage } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.username, username))
      .returning();
    if (!updated) throw new ForbiddenException('User profile not found');
    return updated;
  }

  async updateRole(
    actor: User,
    targetUsername: string,
    newRole: UserRole,
  ): Promise<User> {
    const target = await this.findByUsername(targetUsername);
    if (!target) throw new ForbiddenException('User not found');

    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (
        newRole === UserRole.SUPER_ADMIN ||
        newRole === UserRole.ORGANIZATION_OWNER
      ) {
        throw new ForbiddenException('Only a Super Admin can assign that role');
      }
      if (
        target.role === UserRole.SUPER_ADMIN ||
        target.role === UserRole.ORGANIZATION_OWNER
      ) {
        throw new ForbiddenException("You cannot modify this user's role");
      }
      if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) {
        throw new ForbiddenException(
          'You cannot modify the role of a user with equal or higher rank',
        );
      }
      if (ROLE_RANK[newRole] >= ROLE_RANK[actor.role]) {
        throw new ForbiddenException(
          'You cannot assign a role equal to or higher than your own',
        );
      }
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(users)
        .set({ role: newRole, updatedAt: new Date() })
        .where(eq(users.username, targetUsername))
        .returning();

      await this.auditService.record(
        {
          actionType: 'role_change',
          actorId: actor.username,
          actorRole: actor.role,
          actorName:
            [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
            actor.username,
          targetUserId: target.username,
          targetUserName:
            [target.firstName, target.lastName].filter(Boolean).join(' ') ||
            target.username,
          resourceType: 'user',
          resourceId: target.username,
          resourceName: target.username,
          previousValue: { role: target.role },
          newValue: { role: newRole },
          reason: null,
        },
        { tx },
      );

      return updated;
    });
  }

  async findUsersPaginated(
    currentUsername: string,
    params: FindUsersParams,
  ): Promise<FindUsersResult> {
    const { search, page, limit, sortBy, sortOrder } = params;

    const baseCondition = ne(users.username, currentUsername);
    const searchTerm = search?.trim();

    const searchCondition = searchTerm
      ? or(
          ilike(users.username, `%${searchTerm}%`),
          ilike(users.firstName, `%${searchTerm}%`),
          ilike(users.lastName, `%${searchTerm}%`),
          ilike(users.email, `%${searchTerm}%`),
          ilike(
            sql`concat(${users.firstName}, ' ', ${users.lastName})`,
            `%${searchTerm}%`,
          ),
        )
      : undefined;

    const whereClause = searchCondition
      ? and(baseCondition, searchCondition)
      : baseCondition;

    const sortColumnMap = {
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      createdAt: users.createdAt,
    } as const;

    const sortColumn = sortColumnMap[sortBy];
    const orderClause =
      sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

    const [items, totalResult] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(orderClause)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ]);

    return { items, total: totalResult[0]?.count ?? 0 };
  }
}
