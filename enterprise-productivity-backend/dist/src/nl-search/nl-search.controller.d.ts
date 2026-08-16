import type { AuthObject } from '../auth/auth-object';
import { NlSearchService, NlSearchResponse } from './nl-search.service';
interface AiSearchBody {
    query?: unknown;
}
export declare class NlSearchController {
    private readonly nlSearchService;
    constructor(nlSearchService: NlSearchService);
    aiSearch(auth: AuthObject, body: AiSearchBody): Promise<NlSearchResponse>;
}
export {};
