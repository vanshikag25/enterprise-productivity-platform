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
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles';
import { AutomationService } from './automation.service';
import { WorkflowQueueService } from './queue.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import {
  ToggleWorkflowDto,
  ExecutionsQueryDto,
} from './dto/workflow-query.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowsController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly workflowQueue: WorkflowQueueService,
  ) {}

  @Get('meta')
  @Roles(UserRole.ADMIN)
  meta() {
    return this.automationService.meta();
  }

  @Get('workflows')
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.automationService.findAll();
  }

  @Post('workflows')
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateWorkflowDto) {
    return this.automationService.create({ userId: requireUserId(auth) }, dto);
  }

  @Get('workflows/:id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.automationService.findOne(id);
  }

  @Patch('workflows/:id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.automationService.update(
      { userId: requireUserId(auth) },
      id,
      dto,
    );
  }

  @Delete('workflows/:id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.automationService.remove({ userId: requireUserId(auth) }, id);
  }

  @Patch('workflows/:id/toggle')
  @Roles(UserRole.ADMIN)
  toggle(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: ToggleWorkflowDto,
  ) {
    return this.automationService.toggle(
      { userId: requireUserId(auth) },
      id,
      dto.enabled,
    );
  }

  @Get('workflows/:id/executions')
  @Roles(UserRole.ADMIN)
  listExecutions(@Param('id') id: string, @Query() query: ExecutionsQueryDto) {
    return this.automationService.listExecutions(id, query);
  }

  @Post('workflows/executions/:executionId/retry')
  @Roles(UserRole.ADMIN)
  async retryExecution(
    @CurrentUser() auth: AuthObject,
    @Param('executionId') executionId: string,
  ) {
    const execution = await this.automationService.retryExecution(
      { userId: requireUserId(auth) },
      executionId,
    );
    this.workflowQueue.enqueue(execution.id);
    return execution;
  }
}
