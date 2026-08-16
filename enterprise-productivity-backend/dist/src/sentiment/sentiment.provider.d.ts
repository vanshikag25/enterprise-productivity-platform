export type SentimentCategory = 'positive' | 'frustration' | 'blocker' | 'neutral';
export interface SentimentMessage {
    id: string;
    userId: string | null;
    userName: string | null;
    text: string;
    createdAt: string | null;
}
export interface SentimentContext {
    projectId: string;
    projectName: string;
    channelId: string;
    windowStart: string;
    windowEnd: string;
    messages: SentimentMessage[];
}
export interface MessageInsight {
    messageId: string;
    userId: string | null;
    userName: string | null;
    text: string;
    createdAt: string | null;
    category: SentimentCategory;
    confidence: number;
}
export interface SentimentTrendPoint {
    date: string;
    positive: number;
    frustration: number;
    neutral: number;
}
export interface SentimentOverall {
    label: string;
    score: number;
}
export interface SentimentResult {
    provider: string;
    analyzedCount: number;
    overall: SentimentOverall;
    positives: MessageInsight[];
    frustrations: MessageInsight[];
    blockers: MessageInsight[];
    trend: SentimentTrendPoint[];
}
export declare const SENTIMENT_PROVIDER = "SENTIMENT_PROVIDER";
export interface SentimentProvider {
    readonly name: string;
    analyze(context: SentimentContext): Promise<SentimentResult>;
}
export declare const SENTIMENT_CATEGORIES: SentimentCategory[];
