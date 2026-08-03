import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type ProjectMemberRole } from '../database/schema/projects.schema';
import { UsersService } from '../users/users.service';
export declare const PROJECT_ROLE_RANK: Record<ProjectMemberRole, number>;
export declare function hasProjectRole(role: ProjectMemberRole, minimum: ProjectMemberRole): boolean;
export declare class ProjectAccessService {
    private readonly db;
    private readonly usersService;
    constructor(db: NodePgDatabase, usersService: UsersService);
    memberRole(projectId: string, userId: string): Promise<ProjectMemberRole | null>;
    private orgOverridePasses;
    assertMember(projectId: string, userId: string): Promise<void>;
    assertRole(projectId: string, userId: string, minimum: ProjectMemberRole): Promise<void>;
}
