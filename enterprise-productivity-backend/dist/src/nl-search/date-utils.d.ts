export interface ResolvedDateRange {
    startDate: string;
    endDate: string;
}
export declare function resolveRelativeDateRange(query: string, nowIso: string): ResolvedDateRange | null;
export declare function toValidIso(value: unknown): string | null;
