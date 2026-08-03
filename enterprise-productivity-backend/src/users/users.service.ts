import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { users, User } from '../database/schema/users.schema';
import { UpsertUserInput } from './interfaces/upsert-user.input';
import { UserSortField, SortOrder } from './dto/list-users-query.dto';
import { ROLE_RANK, UserRole } from '../rbac/roles';

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
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  private async superAdminCount(): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'super_admin'));
    return row?.n ?? 0;
  }

  async upsertUser(authUser: UpsertUserInput): Promise<User> {
    const roleValue =
      (await this.superAdminCount()) === 0
        ? ('super_admin' as const)
        : undefined;

    const [user] = await this.db
      .insert(users)
      .values({
        clerkId: authUser.clerkId,
        email: authUser.email,
        firstName: authUser.firstName ?? null,
        lastName: authUser.lastName ?? null,
        imageUrl: authUser.imageUrl ?? null,
        ...(roleValue ? { role: roleValue } : {}),
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email: authUser.email,
          firstName: authUser.firstName ?? null,
          lastName: authUser.lastName ?? null,
          imageUrl: authUser.imageUrl ?? null,
          updatedAt: new Date(),
          ...(roleValue ? { role: roleValue } : {}),
        },
      })
      .returning();

    return user;
  }

  async findAllExcept(clerkId: string): Promise<User[]> {
    return this.db.select().from(users).where(ne(users.clerkId, clerkId));
  }

  async findByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));
    return user;
  }

  async updateRole(
    actor: User,
    targetClerkId: string,
    newRole: UserRole,
  ): Promise<User> {
    const target = await this.findByClerkId(targetClerkId);
    if (!target) throw new NotFoundException('User not found');

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

    const [updated] = await this.db
      .update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.clerkId, targetClerkId))
      .returning();

    return updated;
  }

  async findUsersPaginated(
    currentClerkId: string,
    params: FindUsersParams,
  ): Promise<FindUsersResult> {
    const { search, page, limit, sortBy, sortOrder } = params;

    const baseCondition = ne(users.clerkId, currentClerkId);
    const searchTerm = search?.trim();

    const searchCondition = searchTerm
      ? or(
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
