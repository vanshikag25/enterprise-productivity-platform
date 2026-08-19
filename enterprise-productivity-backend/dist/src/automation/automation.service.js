"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AutomationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const workflows_schema_1 = require("../database/schema/workflows.schema");
const roles_1 = require("../rbac/roles");
const audit_service_1 = require("../audit/audit.service");
const users_service_1 = require("../users/users.service");
const project_access_service_1 = require("../projects/project-access.service");
const action_executor_service_1 = require("./action-executor.service");
const automation_types_1 = require("./automation.types");
let AutomationService = AutomationService_1 = class AutomationService {
    constructor(db, configService, auditService, usersService, access, actionExecutor) {
        this.db = db;
        this.configService = configService;
        this.auditService = auditService;
        this.usersService = usersService;
        this.access = access;
        this.actionExecutor = actionExecutor;
        this.logger = new common_1.Logger(AutomationService_1.name);
    }
    meta() {
        return {
            triggers: automation_types_1.TRIGGER_META,
            conditionFields: automation_types_1.CONDITION_FIELD_META,
            conditionOperators: automation_types_1.CONDITION_OPERATOR_META,
            actions: automation_types_1.ACTION_META,
            templates: automation_types_1.WORKFLOW_TEMPLATES,
        };
    }
    async create(actor, dto) {
        const user = await this.requireAdmin(actor.userId);
        await this.assertManagedResource(actor.userId, dto.triggerConfig);
        const [row] = await this.db
            .insert(workflows_schema_1.automationWorkflows)
            .values({
            name: dto.name,
            description: dto.description ?? null,
            triggerType: dto.triggerType,
            triggerConfig: dto.triggerConfig ?? {},
            conditions: (dto.conditions ?? []),
            actions: (dto.actions ?? []),
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
    async findAll() {
        return this.db
            .select()
            .from(workflows_schema_1.automationWorkflows)
            .orderBy((0, drizzle_orm_1.desc)(workflows_schema_1.automationWorkflows.createdAt));
    }
    async findOne(id) {
        const [row] = await this.db
            .select()
            .from(workflows_schema_1.automationWorkflows)
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.id, id));
        if (!row)
            throw new common_1.NotFoundException(`Workflow ${id} not found`);
        return row;
    }
    async update(actor, id, dto) {
        const user = await this.requireAdmin(actor.userId);
        const existing = await this.findOne(id);
        await this.assertManagedResource(actor.userId, dto.triggerConfig ?? existing.triggerConfig);
        const [updated] = await this.db
            .update(workflows_schema_1.automationWorkflows)
            .set({
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.triggerType !== undefined && {
                triggerType: dto.triggerType,
            }),
            ...(dto.triggerConfig !== undefined && {
                triggerConfig: dto.triggerConfig,
            }),
            ...(dto.conditions !== undefined && {
                conditions: dto.conditions,
            }),
            ...(dto.actions !== undefined && {
                actions: dto.actions,
            }),
            ...(dto.enabled !== undefined && { enabled: dto.enabled }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.id, id))
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
    async remove(actor, id) {
        const user = await this.requireAdmin(actor.userId);
        const existing = await this.findOne(id);
        await this.db
            .delete(workflows_schema_1.automationWorkflows)
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.id, id));
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
    async toggle(actor, id, enabled) {
        const user = await this.requireAdmin(actor.userId);
        const existing = await this.findOne(id);
        const [updated] = await this.db
            .update(workflows_schema_1.automationWorkflows)
            .set({ enabled, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.id, id))
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
    async listExecutions(workflowId, params) {
        const { page, limit } = params;
        const [rows, countRows] = await Promise.all([
            this.db
                .select()
                .from(workflows_schema_1.workflowExecutions)
                .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.workflowId, workflowId))
                .orderBy((0, drizzle_orm_1.desc)(workflows_schema_1.workflowExecutions.createdAt))
                .limit(limit)
                .offset((page - 1) * limit),
            this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(workflows_schema_1.workflowExecutions)
                .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.workflowId, workflowId)),
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
    async retryExecution(actor, executionId) {
        await this.requireAdmin(actor.userId);
        const [execution] = await this.db
            .select()
            .from(workflows_schema_1.workflowExecutions)
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.id, executionId));
        if (!execution) {
            throw new common_1.NotFoundException(`Execution ${executionId} not found`);
        }
        const [updated] = await this.db
            .update(workflows_schema_1.workflowExecutions)
            .set({
            status: 'pending',
            error: null,
            retryCount: 0,
            startedAt: null,
            finishedAt: null,
        })
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.id, executionId))
            .returning();
        return updated;
    }
    async executeExecution(executionId) {
        const [execution] = await this.db
            .select()
            .from(workflows_schema_1.workflowExecutions)
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.id, executionId));
        if (!execution)
            return null;
        const [workflow] = await this.db
            .select()
            .from(workflows_schema_1.automationWorkflows)
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.id, execution.workflowId));
        if (!workflow)
            return null;
        const maxRetries = this.configService.get('automation.maxRetries') ?? 2;
        const retryCount = execution.retryCount;
        await this.db
            .update(workflows_schema_1.workflowExecutions)
            .set({ status: 'running', startedAt: new Date(), error: null })
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.id, executionId));
        const results = await this.actionExecutor.executeAll(workflow, execution.triggerData);
        const failed = results.filter((r) => !r.ok);
        const error = failed.length > 0
            ? (failed[0].error ?? `${failed.length} action(s) failed`)
            : null;
        if (error && retryCount < maxRetries) {
            const nextRetry = retryCount + 1;
            await this.db
                .update(workflows_schema_1.workflowExecutions)
                .set({
                status: 'retried',
                error,
                actionResults: results,
                retryCount: nextRetry,
                finishedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.id, executionId));
            return { status: 'retried', retryCount: nextRetry };
        }
        await this.db
            .update(workflows_schema_1.workflowExecutions)
            .set({
            status: error ? 'failed' : 'success',
            error,
            actionResults: results,
            finishedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(workflows_schema_1.workflowExecutions.id, executionId));
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
    async auditExecution(workflow, triggerType, detail) {
        try {
            const creator = await this.usersService.findByUsername(workflow.createdBy);
            await this.auditService.record({
                actionType: 'workflow_execution',
                actorId: workflow.createdBy,
                actorRole: creator?.role ?? roles_1.UserRole.ADMIN,
                actorName: creator
                    ? `${creator.firstName} ${creator.lastName ?? ''}`.trim()
                    : workflow.createdBy,
                resourceType: 'workflow',
                resourceId: workflow.id,
                resourceName: workflow.name,
                reason: `Workflow ran for trigger ${triggerType}`,
                newValue: detail,
            });
        }
        catch (err) {
            this.logger.warn(`Failed to audit workflow execution: ${err}`);
        }
    }
    async requireAdmin(userId) {
        const user = await this.usersService.findByUsername(userId);
        if (!user || !(0, roles_1.hasMinRole)(user.role, 'admin')) {
            throw new common_1.ForbiddenException('Only Admins and above can manage automation workflows.');
        }
        return user;
    }
    async assertManagedResource(userId, triggerConfig) {
        const projectId = triggerConfig?.projectId;
        if (!projectId || typeof projectId !== 'string')
            return;
        await this.access.assertRole(projectId, userId, 'manager');
    }
};
exports.AutomationService = AutomationService;
exports.AutomationService = AutomationService = AutomationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        config_1.ConfigService,
        audit_service_1.AuditService,
        users_service_1.UsersService,
        project_access_service_1.ProjectAccessService,
        action_executor_service_1.ActionExecutorService])
], AutomationService);
//# sourceMappingURL=automation.service.js.map