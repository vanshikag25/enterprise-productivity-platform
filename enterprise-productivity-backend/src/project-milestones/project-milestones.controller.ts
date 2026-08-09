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
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectMilestonesService } from './project-milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import {
  UpdateMilestoneStatusDto,
  UpdateMilestoneProgressDto,
} from './dto/update-milestone.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('projects/:projectId/milestones')
@UseGuards(JwtAuthGuard)
export class ProjectMilestonesController {
  constructor(private readonly milestonesService: ProjectMilestonesService) {}

  @Get()
  findAll(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.milestonesService.findAll(
      projectId,
      requireUserId(auth),
      status,
      sortBy,
    );
  }

  @Post()
  create(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(projectId, requireUserId(auth), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(
      projectId,
      requireUserId(auth),
      id,
      dto,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneStatusDto,
  ) {
    return this.milestonesService.updateStatus(
      projectId,
      requireUserId(auth),
      id,
      dto.status,
    );
  }

  @Patch(':id/progress')
  updateProgress(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneProgressDto,
  ) {
    return this.milestonesService.updateProgress(
      projectId,
      requireUserId(auth),
      id,
      dto.progress,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.milestonesService.remove(projectId, requireUserId(auth), id);
  }
}
