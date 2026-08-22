import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { UpdateMeetingStatusDto } from './dto/update-meeting-status.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(UserRole.TEAM_LEAD)
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateMeetingDto) {
    return this.meetingsService.create(requireUserId(auth), dto);
  }

  @Get()
  findAll(@CurrentUser() auth: AuthObject) {
    return this.meetingsService.findAllForUser(requireUserId(auth));
  }

  @Get('code/:code')
  findOneByCode(@CurrentUser() auth: AuthObject, @Param('code') code: string) {
    return this.meetingsService.findOneByCode(code, requireUserId(auth));
  }

  @Get(':id')
  findOne(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.meetingsService.findOneForUser(id, requireUserId(auth));
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.meetingsService.update(id, requireUserId(auth), dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingStatusDto,
  ) {
    return this.meetingsService.updateStatus(id, requireUserId(auth), dto.status);
  }

  @Delete(':id')
  @Roles(UserRole.TEAM_LEAD)
  remove(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.meetingsService.remove(id, requireUserId(auth));
  }

  @Post(':id/join')
  join(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.meetingsService.join(id, requireUserId(auth));
  }

  @Post(':id/leave')
  leave(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.meetingsService.leave(id, requireUserId(auth));
  }
}
