import type { AuthObject } from '../auth/auth-object';
import { SentimentService, SentimentAnalysisResponse } from './sentiment.service';
interface SentimentStatusBody {
    enabled?: unknown;
}
interface SentimentAnalyzeBody {
    projectId?: unknown;
    days?: unknown;
}
export declare class SentimentController {
    private readonly sentimentService;
    constructor(sentimentService: SentimentService);
    private uid;
    status(): Promise<{
        enabled: boolean;
    }>;
    setStatus(auth: AuthObject, body: SentimentStatusBody): Promise<{
        enabled: boolean;
    }>;
    analyze(auth: AuthObject, body: SentimentAnalyzeBody): Promise<SentimentAnalysisResponse>;
}
export {};
