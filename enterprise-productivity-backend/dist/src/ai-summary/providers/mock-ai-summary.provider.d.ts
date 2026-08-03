import { AiSummaryContext, AiSummaryProvider, AiSummaryResult } from '../ai-summary.provider';
export declare class MockAiSummaryProvider implements AiSummaryProvider {
    readonly name = "mock";
    generate(context: AiSummaryContext): Promise<AiSummaryResult>;
}
