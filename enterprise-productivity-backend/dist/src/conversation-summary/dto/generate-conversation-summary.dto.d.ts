import { SummaryPeriodType } from '../conversation-summary.provider';
export declare class GenerateConversationSummaryDto {
    channelId: string;
    periodType: SummaryPeriodType;
    start?: string;
    end?: string;
}
