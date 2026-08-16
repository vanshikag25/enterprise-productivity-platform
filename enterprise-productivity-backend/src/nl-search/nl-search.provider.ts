/**
 * Provider-agnostic contract for AI natural-language search intent parsing.
 * New providers (e.g. hosted LLMs) implement `NlSearchProvider` and are
 * registered in the NlSearchModule via the NL_SEARCH_PROVIDER token.
 *
 * The provider turns a free-form query such as
 *   "Show conversations about authentication from last week."
 * into structured search filters: keywords, an absolute date range,
 * relevant users/channels, content sources, and an intent label.
 */

export interface NlSearchContext {
  query: string;
  /** ISO timestamp representing "now" so providers can anchor relative dates. */
  nowIso: string;
  /** Names of channels the requester can access (used to ground channel picks). */
  channelNames: string[];
  /** Display names from the user directory (used to ground user picks). */
  userNames: string[];
}

export interface NlSearchIntent {
  keywords: string[];
  /** Absolute ISO start date (inclusive) of the requested range, if any. */
  startDate: string | null;
  /** Absolute ISO end date (inclusive) of the requested range, if any. */
  endDate: string | null;
  /** Relevant sender usernames / display names, if any. */
  users: string[];
  /** Relevant channel names, if any. */
  channels: string[];
  /**
   * Content scopes mentioned in the query, drawn from a fixed vocabulary:
   * 'chat' | 'tasks' | 'meetings' | 'announcements' | 'projects' |
   * 'milestones' | 'departments'.
   */
  sources: string[];
  /** Short human-readable intent label, e.g. 'find' | 'decisions' | 'recent'. */
  intent: string;
}

export interface NlSearchProviderResult extends NlSearchIntent {
  provider: string;
}

export const NL_SEARCH_PROVIDER = 'NL_SEARCH_PROVIDER';

export interface NlSearchProvider {
  readonly name: string;
  parse(context: NlSearchContext): Promise<NlSearchProviderResult>;
}

/** Content scopes the search can surface results in. */
export const NL_SEARCH_SOURCES = [
  'chat',
  'tasks',
  'meetings',
  'announcements',
  'projects',
  'milestones',
  'departments',
] as const;