import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { User } from '../database/schema/users.schema';
import { UpsertUserInput } from './interfaces/upsert-user.input';
import { UserSortField, SortOrder } from './dto/list-users-query.dto';
import { UserRole } from '../rbac/roles';
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
export declare class UsersService {
    private readonly db;
    constructor(db: NodePgDatabase);
    private superAdminCount;
    upsertUser(authUser: UpsertUserInput): Promise<User>;
    findAllExcept(clerkId: string): Promise<User[]>;
    findByClerkId(clerkId: string): Promise<User | undefined>;
    updateRole(actor: User, targetClerkId: string, newRole: UserRole): Promise<User>;
    findUsersPaginated(currentClerkId: string, params: FindUsersParams): Promise<FindUsersResult>;
}
