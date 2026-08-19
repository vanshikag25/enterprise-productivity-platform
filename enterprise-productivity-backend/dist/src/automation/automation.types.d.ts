import type { WorkflowActionType, WorkflowTriggerType } from '../database/schema/workflows.schema';
export interface WorkflowConfigField {
    key: string;
    label: string;
    type: 'text' | 'select' | 'multiselect' | 'number' | 'date' | 'channel';
    required?: boolean;
    placeholder?: string;
    options?: {
        value: string;
        label: string;
    }[];
    hint?: string;
}
export interface WorkflowTriggerMeta {
    type: WorkflowTriggerType;
    label: string;
    description: string;
    configFields: WorkflowConfigField[];
}
export interface WorkflowConditionFieldMeta {
    key: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'date';
    options?: {
        value: string;
        label: string;
    }[];
}
export interface WorkflowConditionOperatorMeta {
    key: string;
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
        conditions: {
            field: string;
            operator: string;
            value: string | number | string[];
        }[];
        actions: {
            type: WorkflowActionType;
            config: Record<string, unknown>;
        }[];
    };
}
export declare const TASK_STATUS_OPTIONS: {
    value: string;
    label: string;
}[];
export declare const TASK_PRIORITY_OPTIONS: {
    value: string;
    label: string;
}[];
export declare const MILESTONE_STATUS_OPTIONS: {
    value: string;
    label: string;
}[];
export declare const ROLE_OPTIONS: {
    value: string;
    label: string;
}[];
export declare const TRIGGER_META: WorkflowTriggerMeta[];
export declare const CONDITION_FIELD_META: WorkflowConditionFieldMeta[];
export declare const CONDITION_OPERATOR_META: WorkflowConditionOperatorMeta[];
export declare const ACTION_META: WorkflowActionMeta[];
export declare const WORKFLOW_TEMPLATES: WorkflowTemplate[];
