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
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('meetings')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(UserRole.TEAM_LEAD)
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateMeetingDto) {
    return this.meetingsService.create(requireUserId(auth), dto);
  }

  @Get()
  findAll() {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.meetingsService.update(id, requireUserId(auth), dto);
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
