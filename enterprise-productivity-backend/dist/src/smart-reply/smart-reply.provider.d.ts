export interface SmartReplyMessage {
    user: string;
    userId: string | null;
    text: string;
    createdAt: string | null;
}
export interface SmartReplyContext {
    channelId: string;
    channelName: string | null;
    memberCount: number;
    messages: SmartReplyMessage[];
    requesterId: string | null;
}
export interface SmartReplyResult {
    suggestions: string[];
    provider: string;
}
export declare const SMART_REPLY_PROVIDER = "SMART_REPLY_PROVIDER";
export interface SmartReplyProvider {
    readonly name: string;
    generate(context: SmartReplyContext): Promise<SmartReplyResult>;
}
