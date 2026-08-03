import type { AuthObject } from '@clerk/backend';
import { AiSummaryService } from './ai-summary.service';
export declare class AiSummaryController {
    private readonly aiSummaryService;
    constructor(aiSummaryService: AiSummaryService);
    generate(auth: AuthObject, projectId: string): Promise<import("./ai-summary.provider").AiSummaryResult>;
}
