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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
import type { ProjectMemberRole } from '../database/schema/projects.schema';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('projects')
@UseGuards(ClerkAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(requireUserId(auth), dto);
  }

  @Get()
  findAll(@CurrentUser() auth: AuthObject) {
    return this.projectsService.findAll(requireUserId(auth));
  }

  @Get(':id')
  findOne(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.projectsService.findOne(id, requireUserId(auth));
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, requireUserId(auth), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.projectsService.remove(id, requireUserId(auth));
  }

  @Get(':id/members')
  listMembers(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.projectsService.listMembers(id, requireUserId(auth));
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.projectsService.addMember(
      id,
      requireUserId(auth),
      dto.memberId,
      dto.role as ProjectMemberRole | undefined,
    );
  }

  @Patch(':id/members/:memberId')
  updateMemberRole(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.projectsService.updateMemberRole(
      id,
      requireUserId(auth),
      memberId,
      dto.role as ProjectMemberRole,
    );
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectsService.removeMember(id, requireUserId(auth), memberId);
  }
}
