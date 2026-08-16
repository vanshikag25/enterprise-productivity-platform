import { Injectable, Logger } from '@nestjs/common';
import {
  SentimentCategory,
  SentimentContext,
  SentimentMessage,
  SentimentProvider,
  SentimentResult,
} from '../sentiment.provider';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface RawInsightRef {
  messageId?: unknown;
  confidence?: unknown;
}

interface RawTrendPoint {
  date?: unknown;
  positive?: unknown;
  frustration?: unknown;
  neutral?: unknown;
}

interface RawResult {
  overall?: unknown;
  positives?: unknown;
  frustrations?: unknown;
  blockers?: unknown;
  trend?: unknown;
}

const MAX_POSITIVES = 5;
const MAX_FRUSTRATIONS = 10;
const MAX_BLOCKERS = 10;

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * OpenAI-compatible sentiment analyzer. Used when AI_PROVIDER=openai and
 * OPENAI_API_KEY are configured. Talks to the /chat/completions endpoint via
 * fetch (no extra runtime dependency); OPENAI_BASE_URL can point at any
 * compatible gateway. The model only returns message references (not message
 * text), and every reference is grounded against the actual messages passed
 * in the context so hallucinated links can never appear.
 */
@Injectable()
export class OpenAiSentimentProvider implements SentimentProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiSentimentProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async analyze(context: SentimentContext): Promise<SentimentResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.systemPrompt() },
          { role: 'user', content: this.buildPrompt(context) },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `AI provider request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI provider returned an empty response');
    }

    let raw: RawResult;
    try {
      raw = JSON.parse(content) as RawResult;
    } catch {
      this.logger.warn(
        `AI provider returned non-JSON content, falling back: ${content.slice(0, 200)}`,
      );
      raw = {};
    }

    return this.normalize(context, raw);
  }

  private normalize(context: SentimentContext, raw: RawResult): SentimentResult {
    const byId = new Map(context.messages.map((m) => [m.id, m]));

    const resolve = (list: unknown): Array<{ message: SentimentMessage; confidence: number; category: SentimentCategory }> => {
      if (!Array.isArray(list)) return [];
      const items: Array<{ message: SentimentMessage; confidence: number; category: SentimentCategory }> = [];
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const ref = item as RawInsightRef;
        if (typeof ref.messageId !== 'string') continue;
        const message = byId.get(ref.messageId);
        if (!message) continue;
        items.push({
          message,
          confidence: clampScore(asNumber(ref.confidence, 0.7)),
          category: 'neutral' as SentimentCategory,
        });
      }
      return items;
    };

    // Category is assigned by which list the model placed the reference in;
    // the category on the message itself is derived from that list.
    const positives = resolve(raw.positives).slice(0, MAX_POSITIVES);
    const frustrations = resolve(raw.frustrations).slice(0, MAX_FRUSTRATIONS);
    const blockers = resolve(raw.blockers).slice(0, MAX_BLOCKERS);

    const toInsight = (
      items: Array<{ message: SentimentMessage; confidence: number; category: SentimentCategory }>,
      category: SentimentCategory,
    ) =>
      items.map(({ message, confidence }) => ({
        messageId: message.id,
        userId: message.userId,
        userName: message.userName,
        text: message.text,
        createdAt: message.createdAt,
        category,
        confidence,
      }));

    const signalCount = positives.length + frustrations.length;
    const score =
      signalCount === 0
        ? 0.5
        : clampScore(Math.round((positives.length / signalCount) * 100) / 100);

    const rawOverall = (raw.overall ?? {}) as { label?: unknown; score?: unknown };
    const label =
      typeof rawOverall.label === 'string' && rawOverall.label.trim()
        ? rawOverall.label.trim().slice(0, 60)
        : this.labelForScore(score);

    const trend = this.normalizeTrend(raw.trend);

    return {
      provider: this.name,
      analyzedCount: context.messages.filter((m) => m.text.trim()).length,
      overall: { label, score },
      positives: toInsight(positives, 'positive'),
      frustrations: toInsight(frustrations, 'frustration'),
      blockers: toInsight(blockers, 'blocker'),
      trend,
    };
  }

  private normalizeTrend(rawTrend: unknown): SentimentResult['trend'] {
    if (!Array.isArray(rawTrend)) return [];
    const seen = new Set<string>();
    const points: SentimentResult['trend'] = [];
    for (const item of rawTrend) {
      if (!item || typeof item !== 'object') continue;
      const point = item as RawTrendPoint;
      if (typeof point.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(point.date)) continue;
      if (seen.has(point.date)) continue;
      seen.add(point.date);
      points.push({
        date: point.date,
        positive: Math.max(0, Math.floor(asNumber(point.positive, 0))),
        frustration: Math.max(0, Math.floor(asNumber(point.frustration, 0))),
        neutral: Math.max(0, Math.floor(asNumber(point.neutral, 0))),
      });
    }
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }

  private labelForScore(score: number): string {
    if (score >= 0.7) return 'Mostly positive';
    if (score >= 0.55) return 'Slightly positive';
    if (score <= 0.3) return 'Frustrated';
    if (score <= 0.45) return 'Slightly frustrated';
    return 'Balanced';
  }

  private buildPrompt(context: SentimentContext): string {
    const transcript = context.messages
      .map((m) => {
        const speaker = m.userName || m.userId || 'Unknown';
        return `[${m.id}] ${speaker} (${m.createdAt ?? ''}): ${m.text}`;
      })
      .join('\n');

    return [
      `Project: ${context.projectName} (${context.projectId})`,
      `Channel: ${context.channelId}`,
      `Analyzed window: ${context.windowStart} to ${context.windowEnd}`,
      `Message count: ${context.messages.length}`,
      '',
      'Transcript (each line carries the original message id):',
      transcript || '(no messages)',
      '',
      'Produce the sentiment JSON now.',
    ].join('\n');
  }

  private systemPrompt(): string {
    return [
      'You analyze chat messages from a project channel and report team',
      'sentiment for managers.',
      '',
      'Respond with valid JSON only in this exact shape:',
      '{"overall": {"label": string, "score": number},',
      ' "positives": [{"messageId": string, "confidence": number}],',
      ' "frustrations": [{"messageId": string, "confidence": number}],',
      ' "blockers": [{"messageId": string, "confidence": number}],',
      ' "trend": [{"date": "YYYY-MM-DD", "positive": number, "frustration": number, "neutral": number}]}',
      '',
      'Rules:',
      '- For each message pick ONE category: positive, frustration, blocker, or',
      '  neutral. A blocker is a message that reports being blocked/stuck/waiting',
      '  on something or a failure/risk that halts progress. Frustration covers',
      '  discontent with work/processes. Positive covers praise, thanks, and',
      '  progress wins. Everything else is neutral.',
      '- Fill positives/frustrations/blockers with REFERENCES ONLY: reference the',
      '  exact messageId from the transcript, never rewrite the text.',
      '- positivity is any message you classified positive; frustration any you',
      '  classified frustration.',
      '- overall.score is the share of signal that is positive, 0..1.',
      '- trend groups messages by local day across the window; include every day',
      '  that had at least one message (fill counts clamped to integers >= 0).',
      '- confidence is 0..1 reflecting how strongly the message matches the',
      '  category.',
      'Return only the JSON object, nothing else.',
    ].join('\n');
  }
}