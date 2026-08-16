/**
 * Provider-agnostic contract for AI sentiment analysis over project/channel
 * messages. New providers implement `SentimentProvider` and are registered in
 * the SentimentModule via the SENTIMENT_PROVIDER token.
 *
 * A provider classifies each message into one of the supported categories and
 * derives an aggregate overview plus a daily trend for the analyzed window.
 */

export type SentimentCategory = 'positive' | 'frustration' | 'blocker' | 'neutral';

export interface SentimentMessage {
  id: string;
  userId: string | null;
  userName: string | null;
  text: string;
  createdAt: string | null;
}

export interface SentimentContext {
  projectId: string;
  projectName: string;
  channelId: string;
  windowStart: string;
  windowEnd: string;
  messages: SentimentMessage[];
}

export interface MessageInsight {
  messageId: string;
  userId: string | null;
  userName: string | null;
  text: string;
  createdAt: string | null;
  category: SentimentCategory;
  confidence: number;
}

export interface SentimentTrendPoint {
  date: string;
  positive: number;
  frustration: number;
  neutral: number;
}

export interface SentimentOverall {
  label: string;
  score: number; // 0..1, higher = more positive.
}

export interface SentimentResult {
  provider: string;
  analyzedCount: number;
  overall: SentimentOverall;
  positives: MessageInsight[];
  frustrations: MessageInsight[];
  blockers: MessageInsight[];
  trend: SentimentTrendPoint[];
}

export const SENTIMENT_PROVIDER = 'SENTIMENT_PROVIDER';

export interface SentimentProvider {
  readonly name: string;
  analyze(context: SentimentContext): Promise<SentimentResult>;
}

/** Supported categories a provider may emit. */
export const SENTIMENT_CATEGORIES: SentimentCategory[] = [
  'positive',
  'frustration',
  'blocker',
  'neutral',
];