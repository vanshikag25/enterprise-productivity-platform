import { Injectable, Logger } from '@nestjs/common';
import {
  ActionDetectionContext,
  ActionDetectionProvider,
  ActionDetectionResult,
  AI_DETECTED_INTENTS,
  AiDetectedIntent,
  DetectedActionSuggestion,
} from '../action-detection.provider';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface ParsedAction {
  intentType?: string;
  title?: string;
  summary?: string;
  confidence?: number;
  meta?: Record<string, unknown>;
}

/**
 * OpenAI-compatible provider for action detection. Used when AI_PROVIDER=openai
 * and OPENAI_API_KEY are set. Talks to the /chat/completions endpoint via fetch
 * (no extra runtime dependency); OPENAI_BASE_URL can point at any compatible
 * gateway, mirroring the smart-reply provider.
 */
@Injectable()
export class OpenAiActionDetectionProvider implements ActionDetectionProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiActionDetectionProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async detect(
    context: ActionDetectionContext,
  ): Promise<ActionDetectionResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.systemPrompt() },
          {
            role: 'user',
            content: this.buildPrompt(context),
          },
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

    const actions = this.parse(content);
    return { actions, provider: this.name };
  }

  private parse(content: string): DetectedActionSuggestion[] {
    let parsed: { actions?: ParsedAction[] };
    try {
      parsed = JSON.parse(content) as { actions?: ParsedAction[] };
    } catch {
      this.logger.warn(
        `AI provider returned non-JSON content for action detection: ${content.slice(0, 200)}`,
      );
      return [];
    }

    if (!Array.isArray(parsed.actions)) return [];

    const seen = new Set<AiDetectedIntent>();
    const valid: DetectedActionSuggestion[] = [];
    for (const item of parsed.actions) {
      const intentType = this.normalizeIntent(item.intentType);
      if (!intentType) continue;
      if (seen.has(intentType)) continue; // never two cards per intent per message
      seen.add(intentType);

      const title = String(item.title ?? '').trim();
      if (!title) continue;

      valid.push({
        intentType,
        title: title.slice(0, 512),
        summary: String(item.summary ?? '')
          .trim()
          .slice(0, 1024),
        confidence:
          typeof item.confidence === 'number'
            ? Math.min(1, Math.max(0, Math.round(item.confidence * 100) / 100))
            : 0.7,
        meta: item.meta ?? {},
      });
    }
    return valid;
  }

  private normalizeIntent(value: unknown): AiDetectedIntent | null {
    if (typeof value !== 'string') return null;
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const match = AI_DETECTED_INTENTS.find((i) => i === normalized);
    return match ?? null;
  }

  private buildPrompt(context: ActionDetectionContext): string {
    const { message } = context;
    return [
      `Channel: ${context.channelName ?? context.channelId}`,
      `Channel id: ${context.channelId}`,
      '',
      `Message from ${message.user ?? message.userId ?? 'Unknown'}:`,
      message.text,
      '',
      'Analyse this single message and produce the action detection JSON now.',
    ].join('\n');
  }

  private systemPrompt(): string {
    return [
      'You analyse chat messages in a professional messaging app and detect',
      'actionable intents so the product can offer one-tap actions.',
      '',
      'Detect ONLY these intent types: task, meeting, deadline, reminder,',
      'decision, follow_up.',
      '',
      'Respond with valid JSON only, using this exact shape:',
      '{"actions":[{"intentType":"task","title":"...","summary":"...","confidence":0.9,"meta":{}}]}.',
      '',
      'Rules:',
      '- Return an empty actions array when nothing is actionable.',
      '- Return at most ONE action per intent type, and at most 3 total.',
      '- title: a short, human-readable label (<=80 chars) using extracted',
      '  information, e.g. "Create task: migration report" or "Follow up with client".',
      '- confidence: 0..1 reflecting how sure you are.',
      '- meta: extract structured fields to pre-fill forms. Allowed keys:',
      '  title, description, dueDate (ISO), scheduledFor (ISO), scheduledDate (ISO),',
      '  startTime (HH:mm), endTime (HH:mm), priority, assignee, participants',
      '  (array of names/ids), decision, notes.',
      '- Only fill meta keys that are actually present in the message text.',
      '- Do NOT invent people, dates, or facts that are not in the message.',
    ].join('\n');
  }
}
