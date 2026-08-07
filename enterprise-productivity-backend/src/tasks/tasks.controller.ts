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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('tasks')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.TEAM_LEAD)
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(requireUserId(auth), dto);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get('linked/:messageId')
  findBySourceMessage(@Param('messageId') messageId: string) {
    return this.tasksService.findBySourceMessage(messageId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post(':id/channel')
  getOrCreateChannel(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.tasksService.getOrCreateChannel(id, requireUserId(auth));
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, requireUserId(auth), dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, requireUserId(auth), dto.status);
  }

  @Delete(':id')
  @Roles(UserRole.TEAM_LEAD)
  remove(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.tasksService.remove(id, requireUserId(auth));
  }
}
