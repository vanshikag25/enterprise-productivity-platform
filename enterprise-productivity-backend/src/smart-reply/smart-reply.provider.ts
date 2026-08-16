export interface SmartReplyMessage {
  user: string;
  userId: string | null;
  text: string;
  createdAt: string | null;
}

export interface SmartReplyContext {
  channelId: string;
  channelName: string | null;
  memberCount: number;
  messages: SmartReplyMessage[];
  requesterId: string | null;
}

export interface SmartReplyResult {
  suggestions: string[];
  provider: string;
}

export const SMART_REPLY_PROVIDER = 'SMART_REPLY_PROVIDER';

/**
 * Provider-agnostic contract for smart reply generation. New providers (e.g.
 * real LLM integrations) implement this interface and are registered in the
 * SmartReplyModule via the SMART_REPLY_PROVIDER token.
 */
export interface SmartReplyProvider {
  readonly name: string;
  generate(context: SmartReplyContext): Promise<SmartReplyResult>;
}
