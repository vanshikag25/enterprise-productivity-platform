import type { AuthObject } from '../auth/auth-object';
import { AutomationService } from './automation.service';
import { WorkflowQueueService } from './queue.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ToggleWorkflowDto, ExecutionsQueryDto } from './dto/workflow-query.dto';
export declare class WorkflowsController {
    private readonly automationService;
    private readonly workflowQueue;
    constructor(automationService: AutomationService, workflowQueue: WorkflowQueueService);
    meta(): {
        triggers: import("./automation.types").WorkflowTriggerMeta[];
        conditionFields: import("./automation.types").WorkflowConditionFieldMeta[];
        conditionOperators: import("./automation.types").WorkflowConditionOperatorMeta[];
        actions: import("./automation.types").WorkflowActionMeta[];
        templates: import("./automation.types").WorkflowTemplate[];
    };
    findAll(): Promise<{
        id: string;
        name: string;
        description: string | null;
        triggerType: "task_created" | "task_assigned" | "task_completed" | "task_overdue" | "task_status_changed" | "project_created" | "milestone_completed" | "milestone_delayed" | "meeting_ended" | "user_joined" | "message_received" | "mention_received";
        triggerConfig: Record<string, unknown>;
        conditions: import("../database/schema/workflows.schema").WorkflowCondition[];
        actions: import("../database/schema/workflows.schema").WorkflowAction[];
        enabled: boolean;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(auth: AuthObject, dto: CreateWorkflowDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        triggerType: "task_created" | "task_assigned" | "task_completed" | "task_overdue" | "task_status_changed" | "project_created" | "milestone_completed" | "milestone_delayed" | "meeting_ended" | "user_joined" | "message_received" | "mention_received";
        triggerConfig: Record<string, unknown>;
        conditions: import("../database/schema/workflows.schema").WorkflowCondition[];
        actions: import("../database/schema/workflows.schema").WorkflowAction[];
        enabled: boolean;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        triggerType: "task_created" | "task_assigned" | "task_completed" | "task_overdue" | "task_status_changed" | "project_created" | "milestone_completed" | "milestone_delayed" | "meeting_ended" | "user_joined" | "message_received" | "mention_received";
        triggerConfig: Record<string, unknown>;
        conditions: import("../database/schema/workflows.schema").WorkflowCondition[];
        actions: import("../database/schema/workflows.schema").WorkflowAction[];
        enabled: boolean;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(auth: AuthObject, id: string, dto: UpdateWorkflowDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        triggerType: "task_created" | "task_assigned" | "task_completed" | "task_overdue" | "task_status_changed" | "project_created" | "milestone_completed" | "milestone_delayed" | "meeting_ended" | "user_joined" | "message_received" | "mention_received";
        triggerConfig: Record<string, unknown>;
        conditions: import("../database/schema/workflows.schema").WorkflowCondition[];
        actions: import("../database/schema/workflows.schema").WorkflowAction[];
        enabled: boolean;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(auth: AuthObject, id: string): Promise<void>;
    toggle(auth: AuthObject, id: string, dto: ToggleWorkflowDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        triggerType: "task_created" | "task_assigned" | "task_completed" | "task_overdue" | "task_status_changed" | "project_created" | "milestone_completed" | "milestone_delayed" | "meeting_ended" | "user_joined" | "message_received" | "mention_received";
        triggerConfig: Record<string, unknown>;
        conditions: import("../database/schema/workflows.schema").WorkflowCondition[];
        actions: import("../database/schema/workflows.schema").WorkflowAction[];
        enabled: boolean;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listExecutions(id: string, query: ExecutionsQueryDto): Promise<{
        items: import("../database/schema/workflows.schema").WorkflowExecution[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    retryExecution(auth: AuthObject, executionId: string): Promise<{
        id: string;
        triggerType: "task_created" | "task_assigned" | "task_completed" | "task_overdue" | "task_status_changed" | "project_created" | "milestone_completed" | "milestone_delayed" | "meeting_ended" | "user_joined" | "message_received" | "mention_received";
        createdAt: Date;
        workflowId: string;
        eventKey: string;
        triggerData: Record<string, unknown>;
        status: "pending" | "running" | "success" | "failed" | "retried";
        error: string | null;
        actionResults: import("../database/schema/workflows.schema").WorkflowActionResult[];
        retryCount: number;
        startedAt: Date | null;
        finishedAt: Date | null;
    }>;
}
