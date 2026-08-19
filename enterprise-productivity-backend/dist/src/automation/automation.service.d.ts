import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type Workflow, type WorkflowExecution, type WorkflowExecutionStatus } from '../database/schema/workflows.schema';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ExecutionsQueryDto } from './dto/workflow-query.dto';
import { ActionExecutorService } from './action-executor.service';
export interface WorkflowExecutionRun {
    status: WorkflowExecutionStatus;
    retryCount: number;
}
export declare class AutomationService {
    private readonly db;
    private readonly configService;
    private readonly auditService;
    private readonly usersService;
    private readonly access;
    private readonly actionExecutor;
    private readonly logger;
    constructor(db: NodePgDatabase, configService: ConfigService, auditService: AuditService, usersService: UsersService, access: ProjectAccessService, actionExecutor: ActionExecutorService);
    meta(): {
        triggers: import("./automation.types").WorkflowTriggerMeta[];
        conditionFields: import("./automation.types").WorkflowConditionFieldMeta[];
        conditionOperators: import("./automation.types").WorkflowConditionOperatorMeta[];
        actions: import("./automation.types").WorkflowActionMeta[];
        templates: import("./automation.types").WorkflowTemplate[];
    };
    create(actor: {
        userId: string;
    }, dto: CreateWorkflowDto): Promise<Workflow>;
    findAll(): Promise<Workflow[]>;
    findOne(id: string): Promise<Workflow>;
    update(actor: {
        userId: string;
    }, id: string, dto: UpdateWorkflowDto): Promise<Workflow>;
    remove(actor: {
        userId: string;
    }, id: string): Promise<void>;
    toggle(actor: {
        userId: string;
    }, id: string, enabled: boolean): Promise<Workflow>;
    listExecutions(workflowId: string, params: ExecutionsQueryDto): Promise<{
        items: WorkflowExecution[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    retryExecution(actor: {
        userId: string;
    }, executionId: string): Promise<WorkflowExecution>;
    executeExecution(executionId: string): Promise<WorkflowExecutionRun | null>;
    private auditExecution;
    private requireAdmin;
    private assertManagedResource;
}
