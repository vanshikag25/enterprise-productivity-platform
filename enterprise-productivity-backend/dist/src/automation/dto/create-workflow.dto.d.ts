export declare class WorkflowConditionDto {
    field: string;
    operator: string;
    value?: string | number | string[];
}
export declare class WorkflowActionDto {
    type: string;
    config?: Record<string, unknown>;
}
export declare class CreateWorkflowDto {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown>;
    conditions?: WorkflowConditionDto[];
    actions?: WorkflowActionDto[];
    enabled?: boolean;
}
