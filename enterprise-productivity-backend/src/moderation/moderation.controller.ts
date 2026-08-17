import {
  Body,
  Controller,
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
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles';
import { UsersService } from '../users/users.service';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { MuteUserDto } from './dto/mute-user.dto';
import { UserTargetDto } from './dto/user-target.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { LockChannelDto } from './dto/lock-channel.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ListLogsQueryDto } from './dto/list-logs-query.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId) {
    throw new UnauthorizedException('Session has no resolvable userId');
  }
  return auth.userId;
}

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly usersService: UsersService,
  ) {}

  // --- Reports ---------------------------------------------------------------

  @Post('reports')
  async createReport(
    @CurrentUser() auth: AuthObject,
    @Body() dto: CreateReportDto,
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.createReport(actor, dto);
  }

  @Get('reports')
  @Roles(UserRole.TEAM_LEAD)
  async listReports(
    @CurrentUser() auth: AuthObject,
    @Query() query: ListReportsQueryDto,
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.listReports(actor, {
      page: query.page,
      limit: query.limit,
      status: query.status as
        'pending' | 'reviewing' | 'resolved' | 'dismissed' | undefined,
    });
  }

  @Patch('reports/:id')
  @Roles(UserRole.TEAM_LEAD)
  async updateReport(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.updateReport(actor, id, dto.action, dto.note);
  }

  // --- Message moderation ----------------------------------------------------

  @Post('messages/:id/delete')
  @Roles(UserRole.TEAM_LEAD)
  async deleteMessage(
    @CurrentUser() auth: AuthObject,
    @Param('id') messageId: string,
    @Body() body: { reason?: string },
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.deleteMessage(actor, messageId, body?.reason);
  }

  // --- User moderation -------------------------------------------------------

  @Post('users/mute')
  @Roles(UserRole.TEAM_LEAD)
  async muteUser(@CurrentUser() auth: AuthObject, @Body() dto: MuteUserDto) {
    const actor = await this.requireActor(auth);
    return this.moderationService.muteUser(actor, dto);
  }

  @Post('users/unmute')
  @Roles(UserRole.TEAM_LEAD)
  async unmuteUser(
    @CurrentUser() auth: AuthObject,
    @Body() dto: UserTargetDto,
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.unmuteUser(actor, dto);
  }

  @Post('users/remove')
  @Roles(UserRole.MANAGER)
  async removeMember(
    @CurrentUser() auth: AuthObject,
    @Body() dto: UserTargetDto,
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.removeMember(actor, dto);
  }

  @Post('users/ban')
  @Roles(UserRole.ADMIN)
  async banUser(@CurrentUser() auth: AuthObject, @Body() dto: BanUserDto) {
    const actor = await this.requireActor(auth);
    return this.moderationService.banUser(actor, dto);
  }

  @Post('users/unban')
  @Roles(UserRole.ADMIN)
  async unbanUser(@CurrentUser() auth: AuthObject, @Body() dto: BanUserDto) {
    const actor = await this.requireActor(auth);
    return this.moderationService.unbanUser(actor, dto);
  }

  // --- Channel moderation ----------------------------------------------------

  @Post('channels/lock')
  @Roles(UserRole.TEAM_LEAD)
  async lockChannel(
    @CurrentUser() auth: AuthObject,
    @Body() dto: LockChannelDto,
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.setChannelLock(actor, dto);
  }

  // --- Logs ------------------------------------------------------------------

  @Get('logs')
  @Roles(UserRole.TEAM_LEAD)
  async listLogs(
    @CurrentUser() auth: AuthObject,
    @Query() query: ListLogsQueryDto,
  ) {
    const actor = await this.requireActor(auth);
    return this.moderationService.listLogs(actor, {
      page: query.page,
      limit: query.limit,
      actionType: query.actionType,
    });
  }

  private async requireActor(auth: AuthObject) {
    const actor = await this.usersService.findByUsername(requireUserId(auth));
    if (!actor) throw new UnauthorizedException('User profile not found');
    return actor;
  }
}
