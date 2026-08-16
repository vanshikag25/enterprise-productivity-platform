export const AI_DETECTED_INTENTS = [
  'task',
  'meeting',
  'deadline',
  'reminder',
  'decision',
  'follow_up',
] as const;

export type AiDetectedIntent = (typeof AI_DETECTED_INTENTS)[number];

/**
 * A single actionable intent surfaced by the AI provider. `meta` carries the
 * extracted fields used to pre-fill the corresponding entity forms on the
 * client (e.g. `{ dueDate, scheduledDate, startTime, participants }`).
 */
export interface DetectedActionSuggestion {
  intentType: AiDetectedIntent;
  title: string;
  summary: string;
  confidence: number;
  meta?: Record<string, unknown>;
}

/** A single (already normalized) chat message handed to the provider. */
export interface ActionDetectionMessage {
  id?: string;
  user: string;
  userId: string | null;
  text: string;
  createdAt: string | null;
}

export interface ActionDetectionContext {
  channelId: string;
  channelName: string | null;
  message: ActionDetectionMessage;
}

export interface ActionDetectionResult {
  actions: DetectedActionSuggestion[];
  provider: string;
}

export const ACTION_DETECTION_PROVIDER = 'ACTION_DETECTION_PROVIDER';

/**
 * Provider-agnostic contract for AI action detection. Implementations analyse
 * a single new message and return any actionable intents (task creation,
 * meeting requests, deadlines, reminders, decisions, follow-ups) plus the
 * fields extracted to pre-fill the corresponding forms.
 */
export interface ActionDetectionProvider {
  readonly name: string;
  detect(context: ActionDetectionContext): Promise<ActionDetectionResult>;
}
