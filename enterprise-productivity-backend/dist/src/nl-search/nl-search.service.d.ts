import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { NlSearchIntent, NlSearchProvider } from './nl-search.provider';
export interface NlSearchResultItem {
    id: string;
    source: string;
    preview: string;
    senderId: string | null;
    senderName: string | null;
    senderImageUrl: string | null;
    channelId: string;
    channelName: string | null;
    createdAt: string;
    url: string;
    matchedKeywords: string[];
}
export interface NlSearchResponse {
    query: string;
    intent: NlSearchIntent;
    provider: string;
    total: number;
    results: NlSearchResultItem[];
}
export declare class NlSearchService {
    private readonly streamService;
    private readonly usersService;
    private readonly provider;
    private readonly logger;
    constructor(streamService: StreamService, usersService: UsersService, provider: NlSearchProvider);
    search(userId: string, query: string): Promise<NlSearchResponse>;
    private parseIntent;
    private fetchAccessibleChannels;
    private loadDirectoryNames;
    private fetchMessages;
    private enrich;
    private resolveChannel;
    private buildPreview;
}
