export declare const AI_DETECTED_INTENTS: readonly ["task", "meeting", "deadline", "reminder", "decision", "follow_up"];
export type AiDetectedIntent = (typeof AI_DETECTED_INTENTS)[number];
export interface DetectedActionSuggestion {
    intentType: AiDetectedIntent;
    title: string;
    summary: string;
    confidence: number;
    meta?: Record<string, unknown>;
}
export interface ActionDetectionMessage {
    id?: string;
    user: string;
    userId: string | null;
    text: string;
    createdAt: string | null;
}
export interface ActionDetectionContext {
    channelId: string;
    channelName: string | null;
    message: ActionDetectionMessage;
}
export interface ActionDetectionResult {
    actions: DetectedActionSuggestion[];
    provider: string;
}
export declare const ACTION_DETECTION_PROVIDER = "ACTION_DETECTION_PROVIDER";
export interface ActionDetectionProvider {
    readonly name: string;
    detect(context: ActionDetectionContext): Promise<ActionDetectionResult>;
}
