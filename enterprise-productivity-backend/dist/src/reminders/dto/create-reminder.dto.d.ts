export declare const REMINDER_PRIORITIES: readonly ["Low", "Medium", "High"];
export declare class CreateReminderDto {
    title: string;
    scheduledFor: string;
    priority?: string;
    notes?: string;
    sourceChannelId?: string;
    sourceMessageId?: string;
    sourceSenderId?: string;
    sourceChannelName?: string;
}
