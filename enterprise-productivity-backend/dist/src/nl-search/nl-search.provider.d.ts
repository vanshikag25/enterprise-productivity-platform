export interface NlSearchContext {
    query: string;
    nowIso: string;
    channelNames: string[];
    userNames: string[];
}
export interface NlSearchIntent {
    keywords: string[];
    startDate: string | null;
    endDate: string | null;
    users: string[];
    channels: string[];
    sources: string[];
    intent: string;
}
export interface NlSearchProviderResult extends NlSearchIntent {
    provider: string;
}
export declare const NL_SEARCH_PROVIDER = "NL_SEARCH_PROVIDER";
export interface NlSearchProvider {
    readonly name: string;
    parse(context: NlSearchContext): Promise<NlSearchProviderResult>;
}
export declare const NL_SEARCH_SOURCES: readonly ["chat", "tasks", "meetings", "announcements", "projects", "milestones", "departments"];
