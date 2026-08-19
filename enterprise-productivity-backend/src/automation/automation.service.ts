import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  automationWorkflows,
  workflowExecutions,
  type Workflow,
  type WorkflowExecution,
  type WorkflowExecutionStatus,
} from '../database/schema/workflows.schema';
import { hasMinRole, UserRole } from '../rbac/roles';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ExecutionsQueryDto } from './dto/workflow-query.dto';
import { ActionExecutorService } from './action-executor.service';
import {
  ACTION_META,
  CONDITION_FIELD_META,
  CONDITION_OPERATOR_META,
  TRIGGER_META,
  WORKFLOW_TEMPLATES,
} from './automation.types';

export interface WorkflowExecutionRun {
  status: WorkflowExecutionStatus;
  retryCount: number;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly access: ProjectAccessService,
    private readonly actionExecutor: ActionExecutorService,
  ) {}

  // --- Metadata ---------------------------------------------------------------

  meta() {
    return {
      triggers: TRIGGER_META,
      conditionFields: CONDITION_FIELD_META,
      conditionOperators: CONDITION_OPERATOR_META,
      actions: ACTION_META,
      templates: WORKFLOW_TEMPLATES,
    };
  }

  // --- CRUD --------------------------------------------------------------------

  async create(
    actor: { userId: string },
    dto: CreateWorkflowDto,
  ): Promise<Workflow> {
    const user = await this.requireAdmin(actor.userId);
    await this.assertManagedResource(actor.userId, dto.triggerConfig);

    const [row] = await this.db
      .insert(automationWorkflows)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        triggerType: dto.triggerType as Workflow['triggerType'],
        triggerConfig: dto.triggerConfig ?? {},
        conditions: (dto.conditions ?? []) as Workflow['conditions'],
        actions: (dto.actions ?? []) as Workflow['actions'],
        enabled: dto.enabled ?? true,
        createdBy: actor.userId,
      })
      .returning();

    await this.auditService.record({
      actionType: 'workflow_create',
      actorId: actor.userId,
      actorRole: user.role,
      actorName: user.firstName
        ? `${user.firstName} ${user.lastName ?? ''}`.trim()
        : user.email,
      resourceType: 'workflow',
      resourceId: row.id,
      resourceName: row.name,
      newValue: { triggerType: row.triggerType, enabled: row.enabled },
    });

    return row;
  }

  async findAll(): Promise<Workflow[]> {
    return this.db
      .select()
      .from(automationWorkflows)
      .orderBy(desc(automationWorkflows.createdAt));
  }

  async findOne(id: string): Promise<Workflow> {
    const [row] = await this.db
      .select()
      .from(automationWorkflows)
      .where(eq(automationWorkflows.id, id));
    if (!row) throw new NotFoundException(`Workflow ${id} not found`);
    return row;
  }

  async update(
    actor: { userId: string },
    id: string,
    dto: UpdateWorkflowDto,
  ): Promise<Workflow> {
    const user = await this.requireAdmin(actor.userId);
    const existing = await this.findOne(id);
    await this.assertManagedResource(
      actor.userId,
      dto.triggerConfig ?? existing.triggerConfig,
    );

    const [updated] = await this.db
      .update(automationWorkflows)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.triggerType !== undefined && {
          triggerType: dto.triggerType as Workflow['triggerType'],
        }),
        ...(dto.triggerConfig !== undefined && {
          triggerConfig: dto.triggerConfig,
        }),
        ...(dto.conditions !== undefined && {
          conditions: dto.conditions as Workflow['conditions'],
        }),
        ...(dto.actions !== undefined && {
          actions: dto.actions as Workflow['actions'],
        }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        updatedAt: new Date(),
      })
      .where(eq(automationWorkflows.id, id))
      .returning();

    await this.auditService.record({
      actionType: 'workflow_update',
      actorId: actor.userId,
      actorRole: user.role,
      actorName: user.firstName
        ? `${user.firstName} ${user.lastName ?? ''}`.trim()
        : user.email,
      resourceType: 'workflow',
      resourceId: updated.id,
      resourceName: updated.name,
      previousValue: {
        name: existing.name,
        triggerType: existing.triggerType,
        enabled: existing.enabled,
      },
      newValue: {
        name: updated.name,
        triggerType: updated.triggerType,
        enabled: updated.enabled,
      },
    });

    return updated;
  }

  async remove(actor: { userId: string }, id: string): Promise<void> {
    const user = await this.requireAdmin(actor.userId);
    const existing = await this.findOne(id);

    await this.db
      .delete(automationWorkflows)
      .where(eq(automationWorkflows.id, id));

    await this.auditService.record({
      actionType: 'workflow_delete',
      actorId: actor.userId,
      actorRole: user.role,
      actorName: user.firstName
        ? `${user.firstName} ${user.lastName ?? ''}`.trim()
        : user.email,
      resourceType: 'workflow',
      resourceId: existing.id,
      resourceName: existing.name,
    });
  }

  async toggle(
    actor: { userId: string },
    id: string,
    enabled: boolean,
  ): Promise<Workflow> {
    const user = await this.requireAdmin(actor.userId);
    const existing = await this.findOne(id);

    const [updated] = await this.db
      .update(automationWorkflows)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(automationWorkflows.id, id))
      .returning();

    await this.auditService.record({
      actionType: 'workflow_toggle',
      actorId: actor.userId,
      actorRole: user.role,
      actorName: user.firstName
        ? `${user.firstName} ${user.lastName ?? ''}`.trim()
        : user.email,
      resourceType: 'workflow',
      resourceId: updated.id,
      resourceName: updated.name,
      previousValue: { enabled: existing.enabled },
      newValue: { enabled: updated.enabled },
    });

    return updated;
  }

  // --- Execution history -------------------------------------------------------

  async listExecutions(
    workflowId: string,
    params: ExecutionsQueryDto,
  ): Promise<{
    items: WorkflowExecution[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit } = params;
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflowId))
        .orderBy(desc(workflowExecutions.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflowId)),
    ]);

    const total = countRows[0]?.count ?? 0;
    return {
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async retryExecution(
    actor: { userId: string },
    executionId: string,
  ): Promise<WorkflowExecution> {
    await this.requireAdmin(actor.userId);
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId));
    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    const [updated] = await this.db
      .update(workflowExecutions)
      .set({
        status: 'pending',
        error: null,
        retryCount: 0,
        startedAt: null,
        finishedAt: null,
      })
      .where(eq(workflowExecutions.id, executionId))
      .returning();
    return updated;
  }

  // --- Execution engine ----------------------------------------------------------

  /**
   * Runs a single execution end to end. Returns the resulting status and
   * retry count so the queue can schedule a retry when applicable.
   */
  async executeExecution(
    executionId: string,
  ): Promise<WorkflowExecutionRun | null> {
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId));
    if (!execution) return null;

    const [workflow] = await this.db
      .select()
      .from(automationWorkflows)
      .where(eq(automationWorkflows.id, execution.workflowId));
    if (!workflow) return null;

    const maxRetries =
      this.configService.get<number>('automation.maxRetries') ?? 2;
    const retryCount = execution.retryCount;

    await this.db
      .update(workflowExecutions)
      .set({ status: 'running', startedAt: new Date(), error: null })
      .where(eq(workflowExecutions.id, executionId));

    const results = await this.actionExecutor.executeAll(
      workflow,
      execution.triggerData,
    );
    const failed = results.filter((r) => !r.ok);
    const error =
      failed.length > 0
        ? (failed[0].error ?? `${failed.length} action(s) failed`)
        : null;

    if (error && retryCount < maxRetries) {
      const nextRetry = retryCount + 1;
      await this.db
        .update(workflowExecutions)
        .set({
          status: 'retried',
          error,
          actionResults: results,
          retryCount: nextRetry,
          finishedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));
      return { status: 'retried', retryCount: nextRetry };
    }

    await this.db
      .update(workflowExecutions)
      .set({
        status: error ? 'failed' : 'success',
        error,
        actionResults: results,
        finishedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));

    await this.auditExecution(workflow, execution.triggerType, {
      status: error ? 'failed' : 'success',
      error,
      actions: results.map((r) => ({
        type: r.type,
        ok: r.ok,
        error: r.error ?? null,
      })),
    });

    return {
      status: error ? 'failed' : 'success',
      retryCount,
    };
  }

  private async auditExecution(
    workflow: Workflow,
    triggerType: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    try {
      const creator = await this.usersService.findByUsername(
        workflow.createdBy,
      );
      await this.auditService.record({
        actionType: 'workflow_execution',
        actorId: workflow.createdBy,
        actorRole: creator?.role ?? UserRole.ADMIN,
        actorName: creator
          ? `${creator.firstName} ${creator.lastName ?? ''}`.trim()
          : workflow.createdBy,
        resourceType: 'workflow',
        resourceId: workflow.id,
        resourceName: workflow.name,
        reason: `Workflow ran for trigger ${triggerType}`,
        newValue: detail,
      });
    } catch (err) {
      this.logger.warn(`Failed to audit workflow execution: ${err}`);
    }
  }

  // --- Guard helpers -------------------------------------------------------------

  private async requireAdmin(userId: string) {
    const user = await this.usersService.findByUsername(userId);
    if (!user || !hasMinRole(user.role, 'admin')) {
      throw new ForbiddenException(
        'Only Admins and above can manage automation workflows.',
      );
    }
    return user;
  }

  /**
   * Resource scoping: a workflow may reference a project only if the creator
   * manages it (admins and above always pass via the org override).
   */
  private async assertManagedResource(
    userId: string,
    triggerConfig: Record<string, unknown> | undefined,
  ): Promise<void> {
    const projectId = triggerConfig?.projectId;
    if (!projectId || typeof projectId !== 'string') return;
    await this.access.assertRole(projectId, userId, 'manager');
  }
}
