import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { StreamService } from '../stream/stream.service';
import { TranslationProvider } from './translation.provider';
export interface TranslationResponse {
    messageId: string;
    targetLanguage: string;
    sourceLanguage: string | null;
    translatedText: string;
    cached: boolean;
    provider: string;
}
export declare class TranslationService {
    private readonly db;
    private readonly streamService;
    private readonly provider;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService, provider: TranslationProvider);
    translate(channelId: string, messageId: string, userId: string, targetLanguage: string): Promise<TranslationResponse>;
    private findCached;
    private upsertCache;
    private resolveChannel;
    private fetchMessage;
    private hash;
}
