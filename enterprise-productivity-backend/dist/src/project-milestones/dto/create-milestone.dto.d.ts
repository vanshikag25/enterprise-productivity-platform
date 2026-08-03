export declare const MILESTONE_STATUSES: readonly ["planned", "in_progress", "completed", "delayed"];
export declare class CreateMilestoneDto {
    title: string;
    description?: string;
    dueDate?: string;
    ownerId?: string;
    status?: string;
    progress?: number;
}
