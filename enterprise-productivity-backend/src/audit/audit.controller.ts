import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles';
import { UsersService } from '../users/users.service';
import { AuditService } from './audit.service';
import { AuditListQueryDto } from './dto/audit-query.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId) {
    throw new UnauthorizedException('Session has no resolvable userId');
  }
  return auth.userId;
}

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  @Get('logs')
  async listLogs(
    @CurrentUser() auth: AuthObject,
    @Query() query: AuditListQueryDto,
  ) {
    const actor = await this.usersService.findByUsername(requireUserId(auth));
    if (!actor) {
      throw new UnauthorizedException('User profile not found');
    }
    return this.auditService.listLogs(actor, {
      page: query.page ?? 1,
      limit: query.limit ?? 25,
      actionType: query.actionType,
      actorId: query.actorId,
      channelId: query.channelId,
      search: query.search,
      startDate: query.startDate,
      endDate: query.endDate,
      sort: query.sort ?? 'newest',
    });
  }

  @Get('actions')
  actionTypes() {
    return { items: this.auditService.actionTypes() };
  }
}
