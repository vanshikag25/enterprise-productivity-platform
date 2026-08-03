import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles';
import { UsersService } from './users.service';
import { StreamService } from '../stream/stream.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserDirectoryResponse } from './dto/user-directory-response.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('users')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly streamService: StreamService,
  ) {}

  @Get('me')
  async me(@CurrentUser() auth: AuthObject) {
    const user = await this.usersService.findByClerkId(requireUserId(auth));
    if (!user) throw new UnauthorizedException('User profile not found');
    return {
      id: user.clerkId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
    };
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
      items.map((u) => u.clerkId),
    );

    const usersResponse = items.map((u) => {
      const presence = presenceMap.get(u.clerkId);
      return {
        id: u.clerkId,
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

  @Patch(':clerkId/role')
  @Roles(UserRole.ADMIN)
  async updateRole(
    @CurrentUser() auth: AuthObject,
    @Param('clerkId') clerkId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const actor = await this.usersService.findByClerkId(requireUserId(auth));
    if (!actor) throw new UnauthorizedException('User profile not found');
    const updated = await this.usersService.updateRole(
      actor,
      clerkId,
      dto.role,
    );
    return {
      id: updated.clerkId,
      name:
        [updated.firstName, updated.lastName].filter(Boolean).join(' ') ||
        updated.email,
      email: updated.email,
      imageUrl: updated.imageUrl,
      role: updated.role,
    };
  }
}
