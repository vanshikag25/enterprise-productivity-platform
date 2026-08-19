import { apiClient } from './api-client';

export type WorkflowTriggerType =
  | 'task_created'
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'task_status_changed'
  | 'project_created'
  | 'milestone_completed'
  | 'milestone_delayed'
  | 'meeting_ended'
  | 'user_joined'
  | 'message_received'
  | 'mention_received';

export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'retried';

export type WorkflowConditionField =
  | 'actor'
  | 'actorRole'
  | 'projectId'
  | 'projectRole'
  | 'departmentId'
  | 'channelId'
  | 'taskStatus'
  | 'taskPriority'
  | 'assignee'
  | 'dueDate'
  | 'milestoneStatus'
  | 'milestoneProgress'
  | 'meetingStatus'
  | 'meetingOrganizer'
  | 'messageText'
  | 'mentionUser'
  | 'userRole'
  | 'title';

export type WorkflowConditionOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'withinDays';

export type WorkflowActionType =
  | 'notify'
  | 'chatMessage'
  | 'createTask'
  | 'createReminder'
  | 'updateTaskStatus'
  | 'updateMilestoneStatus'
  | 'aiSummary'
  | 'createTasksFromActionItems'
  | 'archiveDiscussion';

export interface WorkflowCondition {
  field: WorkflowConditionField;
  operator: WorkflowConditionOperator;
  value?: string | number | string[];
}

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

export interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionItem {
  id: string;
  workflowId: string;
  triggerType: WorkflowTriggerType;
  eventKey: string;
  triggerData: Record<string, unknown>;
  status: WorkflowExecutionStatus;
  error: string | null;
  actionResults: WorkflowActionResult[];
  retryCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface WorkflowExecutionsPage {
  items: WorkflowExecutionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowConfigField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'date' | 'channel';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  hint?: string;
}

export interface WorkflowTriggerMeta {
  type: WorkflowTriggerType;
  label: string;
  description: string;
  configFields: WorkflowConfigField[];
}

export interface WorkflowConditionFieldMeta {
  key: WorkflowConditionField;
  label: string;
  type: 'text' | 'select' | 'number' | 'date';
  options?: { value: string; label: string }[];
}

export interface WorkflowConditionOperatorMeta {
  key: WorkflowConditionOperator;
  label: string;
}

export interface WorkflowActionMeta {
  type: WorkflowActionType;
  label: string;
  description: string;
  configFields: WorkflowConfigField[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflow: {
    triggerType: WorkflowTriggerType;
    triggerConfig: Record<string, unknown>;
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
  };
}

export interface WorkflowMeta {
  triggers: WorkflowTriggerMeta[];
  conditionFields: WorkflowConditionFieldMeta[];
  conditionOperators: WorkflowConditionOperatorMeta[];
  actions: WorkflowActionMeta[];
  templates: WorkflowTemplate[];
}

export interface CreateWorkflowPayload {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  enabled?: boolean;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchWorkflowMeta(token: string): Promise<WorkflowMeta> {
  const res = await apiClient.get<WorkflowMeta>('/automation/meta', { headers: headers(token) });
  return res.data;
}

export async function listWorkflows(token: string): Promise<WorkflowItem[]> {
  const res = await apiClient.get<WorkflowItem[]>('/automation/workflows', { headers: headers(token) });
  return res.data;
}

export async function fetchWorkflow(token: string, id: string): Promise<WorkflowItem> {
  const res = await apiClient.get<WorkflowItem>(`/automation/workflows/${id}`, { headers: headers(token) });
  return res.data;
}

export async function createWorkflow(token: string, payload: CreateWorkflowPayload): Promise<WorkflowItem> {
  const res = await apiClient.post<WorkflowItem>('/automation/workflows', payload, { headers: headers(token) });
  return res.data;
}

export async function updateWorkflow(
  token: string,
  id: string,
  payload: Partial<CreateWorkflowPayload>,
): Promise<WorkflowItem> {
  const res = await apiClient.patch<WorkflowItem>(`/automation/workflows/${id}`, payload, { headers: headers(token) });
  return res.data;
}

export async function toggleWorkflow(token: string, id: string, enabled: boolean): Promise<WorkflowItem> {
  const res = await apiClient.patch<WorkflowItem>(`/automation/workflows/${id}/toggle`, { enabled }, { headers: headers(token) });
  return res.data;
}

export async function deleteWorkflow(token: string, id: string): Promise<void> {
  await apiClient.delete(`/automation/workflows/${id}`, { headers: headers(token) });
}

export async function listWorkflowExecutions(
  token: string,
  workflowId: string,
  params?: { page?: number; limit?: number },
): Promise<WorkflowExecutionsPage> {
  const res = await apiClient.get<WorkflowExecutionsPage>(
    `/automation/workflows/${workflowId}/executions`,
    { headers: headers(token), params },
  );
  return res.data;
}

export async function retryWorkflowExecution(token: string, executionId: string): Promise<WorkflowExecutionItem> {
  const res = await apiClient.post<WorkflowExecutionItem>(
    `/automation/workflows/executions/${executionId}/retry`,
    {},
    { headers: headers(token) },
  );
  return res.data;
}