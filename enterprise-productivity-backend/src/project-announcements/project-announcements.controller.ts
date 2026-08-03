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
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { ProjectAnnouncementsService } from './project-announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AddReactionDto, SetPinnedDto } from './dto/announcement-actions.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('projects/:projectId/announcements')
@UseGuards(ClerkAuthGuard)
export class ProjectAnnouncementsController {
  constructor(
    private readonly announcementsService: ProjectAnnouncementsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Query('q') q?: string,
  ) {
    return this.announcementsService.findAll(projectId, requireUserId(auth), q);
  }

  @Post()
  create(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(
      projectId,
      requireUserId(auth),
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(
      projectId,
      requireUserId(auth),
      id,
      dto,
    );
  }

  @Patch(':id/pin')
  setPinned(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: SetPinnedDto,
  ) {
    return this.announcementsService.setPinned(
      projectId,
      requireUserId(auth),
      id,
      dto.isPinned,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.announcementsService.remove(projectId, requireUserId(auth), id);
  }

  @Post(':id/reactions')
  addReaction(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.announcementsService.addReaction(
      projectId,
      requireUserId(auth),
      id,
      dto.emoji,
    );
  }

  @Delete(':id/reactions/:emoji')
  removeReaction(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('emoji') emoji: string,
  ) {
    return this.announcementsService.removeReaction(
      projectId,
      requireUserId(auth),
      id,
      decodeURIComponent(emoji),
    );
  }
}
