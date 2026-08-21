export declare const MANUAL_USER_STATUSES: readonly ["away", "busy", "in_meeting", "dnd"];
export type ManualUserStatus = (typeof MANUAL_USER_STATUSES)[number];
export declare class UpdateStatusDto {
    status: ManualUserStatus | null;
}
