"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowExecutions = exports.automationWorkflows = exports.WORKFLOW_ACTION_TYPES = exports.WORKFLOW_CONDITION_OPERATORS = exports.WORKFLOW_CONDITION_FIELDS = exports.workflowExecutionStatusEnum = exports.workflowTriggerTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.workflowTriggerTypeEnum = (0, pg_core_1.pgEnum)('workflow_trigger_type', [
    'task_created',
    'task_assigned',
    'task_completed',
    'task_overdue',
    'task_status_changed',
    'project_created',
    'milestone_completed',
    'milestone_delayed',
    'meeting_ended',
    'user_joined',
    'message_received',
    'mention_received',
]);
exports.workflowExecutionStatusEnum = (0, pg_core_1.pgEnum)('workflow_execution_status', [
    'pending',
    'running',
    'success',
    'failed',
    'retried',
]);
exports.WORKFLOW_CONDITION_FIELDS = [
    'actor',
    'actorRole',
    'projectId',
    'projectRole',
    'departmentId',
    'channelId',
    'taskStatus',
    'taskPriority',
    'assignee',
    'dueDate',
    'milestoneStatus',
    'milestoneProgress',
    'meetingStatus',
    'meetingOrganizer',
    'messageText',
    'mentionUser',
    'userRole',
    'title',
];
exports.WORKFLOW_CONDITION_OPERATORS = [
    'eq',
    'neq',
    'in',
    'contains',
    'gt',
    'gte',
    'lt',
    'lte',
    'withinDays',
];
exports.WORKFLOW_ACTION_TYPES = [
    'notify',
    'chatMessage',
    'createTask',
    'createReminder',
    'updateTaskStatus',
    'updateMilestoneStatus',
    'aiSummary',
    'createTasksFromActionItems',
    'archiveDiscussion',
];
exports.automationWorkflows = (0, pg_core_1.pgTable)('automation_workflows', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    triggerType: (0, exports.workflowTriggerTypeEnum)('trigger_type').notNull(),
    triggerConfig: (0, pg_core_1.jsonb)('trigger_config')
        .$type()
        .notNull()
        .default({}),
    conditions: (0, pg_core_1.jsonb)('conditions')
        .$type()
        .notNull()
        .default([]),
    actions: (0, pg_core_1.jsonb)('actions').$type().notNull().default([]),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(true),
    createdBy: (0, pg_core_1.varchar)('created_by', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('automation_workflows_trigger_idx').on(table.triggerType, table.enabled),
    (0, pg_core_1.index)('automation_workflows_created_by_idx').on(table.createdBy),
]);
exports.workflowExecutions = (0, pg_core_1.pgTable)('workflow_executions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    workflowId: (0, pg_core_1.uuid)('workflow_id')
        .notNull()
        .references(() => exports.automationWorkflows.id, { onDelete: 'cascade' }),
    triggerType: (0, exports.workflowTriggerTypeEnum)('trigger_type').notNull(),
    eventKey: (0, pg_core_1.varchar)('event_key', { length: 512 }).notNull(),
    triggerData: (0, pg_core_1.jsonb)('trigger_data')
        .$type()
        .notNull()
        .default({}),
    status: (0, exports.workflowExecutionStatusEnum)('status').notNull().default('pending'),
    error: (0, pg_core_1.text)('error'),
    actionResults: (0, pg_core_1.jsonb)('action_results')
        .$type()
        .notNull()
        .default([]),
    retryCount: (0, pg_core_1.integer)('retry_count').notNull().default(0),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }),
    finishedAt: (0, pg_core_1.timestamp)('finished_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('workflow_executions_dedup_idx').on(table.workflowId, table.eventKey),
    (0, pg_core_1.index)('workflow_executions_workflow_idx').on(table.workflowId),
    (0, pg_core_1.index)('workflow_executions_status_idx').on(table.status),
]);
//# sourceMappingURL=workflows.schema.js.map