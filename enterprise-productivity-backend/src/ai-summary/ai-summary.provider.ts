export interface AiSummaryMessage {
  user: string;
  text: string;
  createdAt: string | null;
}

export interface AiSummaryMilestone {
  title: string;
  status: string;
  progress: number;
}

export interface AiSummaryAnnouncement {
  title: string;
  body: string;
  author: string | null;
}

export interface AiSummaryContext {
  project: { id: string; name: string; description: string | null };
  memberCount: number;
  recentMessages: AiSummaryMessage[];
  announcements: AiSummaryAnnouncement[];
  milestones: AiSummaryMilestone[];
}

export interface AiSummaryResult {
  overview: string;
  keyDecisions: string[];
  actionItems: string[];
  blockers: string[];
  generatedAt: string;
  provider: string;
}

export const AI_SUMMARY_PROVIDER = 'AI_SUMMARY_PROVIDER';

/**
 * Provider-agnostic contract for AI summary generation. New providers
 * (e.g. real LLM integrations) implement this interface and are registered
 * in the AiSummaryModule via the AI_SUMMARY_PROVIDER token.
 */
export interface AiSummaryProvider {
  readonly name: string;
  generate(context: AiSummaryContext): Promise<AiSummaryResult>;
}
