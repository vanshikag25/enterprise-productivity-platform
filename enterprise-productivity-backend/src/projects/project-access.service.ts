import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  projectMembers,
  type ProjectMemberRole,
} from '../database/schema/projects.schema';
import { UsersService } from '../users/users.service';
import { hasMinRole } from '../rbac/roles';

export const PROJECT_ROLE_RANK: Record<ProjectMemberRole, number> = {
  owner: 4,
  manager: 3,
  member: 2,
  guest: 1,
};

export function hasProjectRole(
  role: ProjectMemberRole,
  minimum: ProjectMemberRole,
): boolean {
  return PROJECT_ROLE_RANK[role] >= PROJECT_ROLE_RANK[minimum];
}

@Injectable()
export class ProjectAccessService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly usersService: UsersService,
  ) {}

  async memberRole(
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberRole | null> {
    const [row] = await this.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      );
    return row?.role ?? null;
  }

  /**
   * Organization-level privileges act as an override for per-project roles.
   * Admins and above can do anything; org managers can operate at the
   * "manager" project level but not take owner-only actions.
   */
  private async orgOverridePasses(
    userId: string,
    minimum: ProjectMemberRole,
  ): Promise<boolean> {
    const user = await this.usersService.findByClerkId(userId);
    if (!user) return false;
    if (hasMinRole(user.role, 'admin')) return true;
    if (minimum !== 'owner' && hasMinRole(user.role, 'manager')) return true;
    return false;
  }

  async assertMember(projectId: string, userId: string): Promise<void> {
    if (await this.orgOverridePasses(userId, 'member')) return;
    const role = await this.memberRole(projectId, userId);
    if (!role) {
      throw new ForbiddenException('You are not a member of this project');
    }
  }

  async assertRole(
    projectId: string,
    userId: string,
    minimum: ProjectMemberRole,
  ): Promise<void> {
    if (await this.orgOverridePasses(userId, minimum)) return;
    const role = await this.memberRole(projectId, userId);
    if (!role || !hasProjectRole(role, minimum)) {
      throw new ForbiddenException(
        `This action requires at least the "${minimum}" role in this project`,
      );
    }
  }
}
