import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles';
import { UsersService } from './users.service';
import { StreamService } from '../stream/stream.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { UserDirectoryResponse } from './dto/user-directory-response.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly streamService: StreamService,
  ) {}

  @Get('me')
  async me(@CurrentUser() auth: AuthObject) {
    const user = await this.usersService.findByUsername(requireUserId(auth));
    if (!user) throw new UnauthorizedException('User profile not found');
    return {
      id: user.username,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() auth: AuthObject,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(
      requireUserId(auth),
      dto,
    );
    return {
      id: user.username,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @Post('me/password')
  async changePassword(
    @CurrentUser() auth: AuthObject,
    @Body() dto: ChangePasswordDto,
  ) {
    const username = requireUserId(auth);
    await this.authService.changePassword(
      username,
      dto.currentPassword,
      dto.newPassword,
    );
    return { id: username, updated: true };
  }

  @Post('me/username')
  async changeUsername(
    @CurrentUser() auth: AuthObject,
    @Body() dto: ChangeUsernameDto,
  ) {
    const username = requireUserId(auth);
    const updated = await this.usersService.changeUsername(
      username,
      dto.username,
    );
    // The issued token is a new one: the JWT `sub` is the username, so the
    // client must replace its session (and clear the old one) after a rename.
    return this.authService.issueSession(updated);
  }

  @Get()
  async listUsers(
    @CurrentUser() auth: AuthObject,
    @Query() query: ListUsersQueryDto,
  ): Promise<UserDirectoryResponse> {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }

    const { items, total } = await this.usersService.findUsersPaginated(
      auth.userId,
      {
        search: query.search,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );

    const presenceMap = await this.streamService.getUsersPresence(
      items.map((u) => u.username),
    );

    const usersResponse = items.map((u) => {
      const presence = presenceMap.get(u.username);
      return {
        id: u.username,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        email: u.email,
        imageUrl: u.imageUrl,
        online: presence?.online ?? false,
        lastSeen: presence?.lastActive ?? null,
        joinedAt: u.createdAt.toISOString(),
        role: u.role,
      };
    });

    return {
      users: usersResponse,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  @Patch(':username/role')
  @Roles(UserRole.ADMIN)
  async updateRole(
    @CurrentUser() auth: AuthObject,
    @Param('username') username: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const actor = await this.usersService.findByUsername(requireUserId(auth));
    if (!actor) throw new UnauthorizedException('User profile not found');
    const updated = await this.usersService.updateRole(actor, username, dto.role);
    return {
      id: updated.username,
      name:
        [updated.firstName, updated.lastName].filter(Boolean).join(' ') ||
        updated.email,
      email: updated.email,
      imageUrl: updated.imageUrl,
      role: updated.role,
    };
  }

  @Delete(':username')
  @Roles(UserRole.SUPER_ADMIN)
  async removeUser(
    @CurrentUser() auth: AuthObject,
    @Param('username') username: string,
  ) {
    const actor = await this.usersService.findByUsername(requireUserId(auth));
    if (!actor) throw new UnauthorizedException('User profile not found');
    await this.usersService.removeUser(actor, username);
    return { id: username, removed: true };
  }
}