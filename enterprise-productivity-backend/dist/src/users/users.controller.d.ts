import type { AuthObject } from '@clerk/backend';
import { UsersService } from './users.service';
import { StreamService } from '../stream/stream.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserDirectoryResponse } from './dto/user-directory-response.dto';
export declare class UsersController {
    private readonly usersService;
    private readonly streamService;
    constructor(usersService: UsersService, streamService: StreamService);
    me(auth: AuthObject): Promise<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        imageUrl: string | null;
        role: "super_admin" | "organization_owner" | "admin" | "manager" | "team_lead" | "employee" | "guest";
    }>;
    listUsers(auth: AuthObject, query: ListUsersQueryDto): Promise<UserDirectoryResponse>;
    updateRole(auth: AuthObject, clerkId: string, dto: UpdateUserRoleDto): Promise<{
        id: string;
        name: string;
        email: string;
        imageUrl: string | null;
        role: "super_admin" | "organization_owner" | "admin" | "manager" | "team_lead" | "employee" | "guest";
    }>;
}
