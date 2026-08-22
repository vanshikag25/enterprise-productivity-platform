export declare class CreateMeetingDto {
    title: string;
    description?: string;
    agenda?: string;
    notes?: string;
    attachments?: string[];
    recordingLink?: string;
    meetingUrl?: string;
    meetingStatus?: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';
    scheduledDate: string;
    startTime: string;
    endTime: string;
    participants: string[];
    sourceChannelId?: string;
    sourceMessageId?: string;
    sourceSenderId?: string;
    sourceChannelName?: string;
}
