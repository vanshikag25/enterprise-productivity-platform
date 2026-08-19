import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Automation workflow engine.
 *
 * A workflow is a declarative rule: WHEN <trigger> fires AND <conditions>
 * match, THEN run <actions>. Trigger events are emitted by existing feature
 * services (tasks, projects, milestones, meetings, users) through the
 * WorkflowEventBus and processed asynchronously by the automation module.
 *
 * `workflow_executions` records one run per (workflow, eventKey). The unique
 * index on (workflowId, eventKey) is the dedup guard: re-emitting the same
 * event for the same workflow is a no-op.
 */

export const workflowTriggerTypeEnum = pgEnum('workflow_trigger_type', [
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

export const workflowExecutionStatusEnum = pgEnum('workflow_execution_status', [
  'pending',
  'running',
  'success',
  'failed',
  'retried',
]);

export const WORKFLOW_CONDITION_FIELDS = [
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
] as const;
export type WorkflowConditionField = (typeof WORKFLOW_CONDITION_FIELDS)[number];

export const WORKFLOW_CONDITION_OPERATORS = [
  'eq',
  'neq',
  'in',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'withinDays',
] as const;
export type WorkflowConditionOperator =
  (typeof WORKFLOW_CONDITION_OPERATORS)[number];

export interface WorkflowCondition {
  field: WorkflowConditionField;
  operator: WorkflowConditionOperator;
  value: string | number | string[];
}

export const WORKFLOW_ACTION_TYPES = [
  'notify',
  'chatMessage',
  'createTask',
  'createReminder',
  'updateTaskStatus',
  'updateMilestoneStatus',
  'aiSummary',
  'createTasksFromActionItems',
  'archiveDiscussion',
] as const;
export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface WorkflowActionResult {
  type: WorkflowActionType;
  ok: boolean;
  error?: string;
  detail?: Record<string, unknown>;
}

export const automationWorkflows = pgTable(
  'automation_workflows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    triggerType: workflowTriggerTypeEnum('trigger_type').notNull(),
    triggerConfig: jsonb('trigger_config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    conditions: jsonb('conditions')
      .$type<WorkflowCondition[]>()
      .notNull()
      .default([]),
    actions: jsonb('actions').$type<WorkflowAction[]>().notNull().default([]),
    enabled: boolean('enabled').notNull().default(true),
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('automation_workflows_trigger_idx').on(
      table.triggerType,
      table.enabled,
    ),
    index('automation_workflows_created_by_idx').on(table.createdBy),
  ],
);

export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => automationWorkflows.id, { onDelete: 'cascade' }),
    triggerType: workflowTriggerTypeEnum('trigger_type').notNull(),
    eventKey: varchar('event_key', { length: 512 }).notNull(),
    triggerData: jsonb('trigger_data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: workflowExecutionStatusEnum('status').notNull().default('pending'),
    error: text('error'),
    actionResults: jsonb('action_results')
      .$type<WorkflowActionResult[]>()
      .notNull()
      .default([]),
    retryCount: integer('retry_count').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('workflow_executions_dedup_idx').on(
      table.workflowId,
      table.eventKey,
    ),
    index('workflow_executions_workflow_idx').on(table.workflowId),
    index('workflow_executions_status_idx').on(table.status),
  ],
);

export type Workflow = typeof automationWorkflows.$inferSelect;
export type NewWorkflow = typeof automationWorkflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type WorkflowTriggerType =
  (typeof workflowTriggerTypeEnum.enumValues)[number];
export type WorkflowExecutionStatus =
  (typeof workflowExecutionStatusEnum.enumValues)[number];
