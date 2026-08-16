import { NlSearchContext, NlSearchProvider, NlSearchProviderResult } from '../nl-search.provider';
export declare class MockNlSearchProvider implements NlSearchProvider {
    readonly name = "mock";
    parse(context: NlSearchContext): Promise<NlSearchProviderResult>;
}
