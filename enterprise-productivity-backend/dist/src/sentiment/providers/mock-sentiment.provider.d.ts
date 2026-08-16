import { SentimentContext, SentimentProvider, SentimentResult } from '../sentiment.provider';
export declare class MockSentimentProvider implements SentimentProvider {
    readonly name = "mock";
    analyze(context: SentimentContext): Promise<SentimentResult>;
}
