export type SummaryPeriodType = 'daily' | 'weekly' | 'manual';

export interface ConversationSummaryMessage {
  user: string;
  text: string;
  createdAt: string | null;
}

export interface ConversationSummaryContext {
  channelId: string;
  channelName: string | null;
  memberCount: number;
  periodType: SummaryPeriodType;
  periodStart: string;
  periodEnd: string;
  messages: ConversationSummaryMessage[];
}

export interface ConversationSummaryResult {
  overview: string;
  keyDecisions: string[];
  actionItems: string[];
  unresolvedTopics: string[];
  generatedAt: string;
  provider: string;
}

export const CONVERSATION_SUMMARY_PROVIDER = 'CONVERSATION_SUMMARY_PROVIDER';

/**
 * Provider-agnostic contract for conversation summary generation. New
 * providers (e.g. real LLM integrations) implement this interface and are
 * registered in the ConversationSummaryModule via the
 * CONVERSATION_SUMMARY_PROVIDER token.
 */
export interface ConversationSummaryProvider {
  readonly name: string;
  generate(
    context: ConversationSummaryContext,
  ): Promise<ConversationSummaryResult>;
}
