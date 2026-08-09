import type { AuthObject } from '../auth/auth-object';
import { AiSummaryService } from './ai-summary.service';
export declare class AiSummaryController {
    private readonly aiSummaryService;
    constructor(aiSummaryService: AiSummaryService);
    generate(auth: AuthObject, projectId: string): Promise<import("./ai-summary.provider").AiSummaryResult>;
}
