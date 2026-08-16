import type { AuthObject } from '../auth/auth-object';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';
import { StreamService } from '../stream/stream.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { UserDirectoryResponse } from './dto/user-directory-response.dto';
export declare class UsersController {
    private readonly usersService;
    private readonly authService;
    private readonly streamService;
    constructor(usersService: UsersService, authService: AuthService, streamService: StreamService);
    me(auth: AuthObject): Promise<{
        id: string;
        username: string;
        firstName: string | null;
        lastName: string | null;
        fullName: string;
        email: string;
        imageUrl: string | null;
        role: string;
        preferredLanguage: string;
        createdAt: string;
    }>;
    updateMe(auth: AuthObject, dto: UpdateProfileDto): Promise<{
        id: string;
        username: string;
        firstName: string | null;
        lastName: string | null;
        fullName: string;
        email: string;
        imageUrl: string | null;
        role: string;
        preferredLanguage: string;
        createdAt: string;
    }>;
    private serializeMe;
    changePassword(auth: AuthObject, dto: ChangePasswordDto): Promise<{
        id: string;
        updated: boolean;
    }>;
    changeUsername(auth: AuthObject, dto: ChangeUsernameDto): Promise<import("../auth/auth.service").AuthSession>;
    listUsers(auth: AuthObject, query: ListUsersQueryDto): Promise<UserDirectoryResponse>;
    updateRole(auth: AuthObject, username: string, dto: UpdateUserRoleDto): Promise<{
        id: string;
        name: string;
        email: string;
        imageUrl: string | null;
        role: "super_admin" | "organization_owner" | "admin" | "manager" | "team_lead" | "employee" | "guest";
    }>;
    removeUser(auth: AuthObject, username: string): Promise<{
        id: string;
        removed: boolean;
    }>;
}
