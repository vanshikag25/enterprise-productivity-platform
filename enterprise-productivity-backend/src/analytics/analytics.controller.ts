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
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsDetailQueryDto,
  AnalyticsQueryDto,
} from './dto/analytics-query.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId) {
    throw new UnauthorizedException('Session has no resolvable userId');
  }
  return auth.userId;
}

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async overview(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.overview(requireUserId(auth), query);
  }

  @Get('messages')
  async messages(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.messagesDetail(requireUserId(auth), query);
  }

  @Get('users')
  async users(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.usersDetail(requireUserId(auth), query);
  }

  @Get('channels')
  async channels(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.channelsDetail(requireUserId(auth), query);
  }

  @Get('teams')
  async teams(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.teamsDetail(requireUserId(auth), query);
  }

  @Get('storage')
  async storage(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.storageDetail(requireUserId(auth), query);
  }

  @Get('ai')
  async ai(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.aiDetail(requireUserId(auth), query);
  }

  @Get('moderation')
  async moderation(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.moderationDetail(requireUserId(auth), query);
  }

  @Get('response-time')
  async responseTime(
    @CurrentUser() auth: AuthObject,
    @Query() query: AnalyticsDetailQueryDto,
  ) {
    return this.analyticsService.responseTimeDetail(requireUserId(auth), query);
  }
}
