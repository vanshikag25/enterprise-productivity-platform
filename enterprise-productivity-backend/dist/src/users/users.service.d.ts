import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { User } from '../database/schema/users.schema';
import { UserSortField, SortOrder } from './dto/list-users-query.dto';
import { UserRole } from '../rbac/roles';
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
export declare class UsersService {
    private readonly db;
    private readonly auditService;
    constructor(db: NodePgDatabase, auditService: AuditService);
    findByUsername(username: string): Promise<User | undefined>;
    findByEmail(email: string): Promise<User | undefined>;
    findAllExcept(username: string): Promise<User[]>;
    count(): Promise<number>;
    createUser(input: CreateUserInput): Promise<User>;
    updatePassword(username: string, passwordHash: string): Promise<User>;
    changeUsername(currentUsername: string, newUsername: string): Promise<User>;
    removeUser(actor: User, targetUsername: string): Promise<void>;
    updateProfile(username: string, patch: {
        firstName?: string | null;
        lastName?: string | null;
        imageUrl?: string | null;
        preferredLanguage?: string;
    }): Promise<User>;
    updateStatus(username: string, status: string | null): Promise<User>;
    updateRole(actor: User, targetUsername: string, newRole: UserRole): Promise<User>;
    findUsersPaginated(currentUsername: string, params: FindUsersParams): Promise<FindUsersResult>;
}
