export declare const TASK_STATUSES: readonly ["Todo", "In Progress", "In Review", "Completed", "Closed"];
export declare const TASK_PRIORITIES: readonly ["Low", "Medium", "High", "Critical"];
export declare class CreateTaskDto {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assignee?: string;
}
