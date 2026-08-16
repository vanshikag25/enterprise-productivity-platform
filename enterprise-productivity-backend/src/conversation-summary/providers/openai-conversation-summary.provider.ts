import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationSummaryContext,
  ConversationSummaryProvider,
  ConversationSummaryResult,
} from '../conversation-summary.provider';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * OpenAI-compatible provider for conversation summaries. Used when
 * AI_PROVIDER=openai and OPENAI_API_KEY are configured. Talks to the
 * /chat/completions endpoint via fetch so no extra runtime dependency is
 * needed; OPENAI_BASE_URL can point at any compatible gateway.
 */
@Injectable()
export class OpenAiConversationSummaryProvider implements ConversationSummaryProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiConversationSummaryProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async generate(
    context: ConversationSummaryContext,
  ): Promise<ConversationSummaryResult> {
    const prompt = this.buildPrompt(context);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You summarize workplace chat conversations. Respond with valid JSON only, using this exact shape: ' +
              '{"overview": string, "keyDecisions": string[], "actionItems": string[], "unresolvedTopics": string[]}. ' +
              'Keep overview under 3 sentences; each array item must be a concise bullet. ' +
              'If a category has nothing, return an empty array.',
          },
          { role: 'user', content: prompt },
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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      this.logger.warn(
        `AI provider returned non-JSON content, falling back to text: ${content.slice(0, 200)}`,
      );
      parsed = { overview: content };
    }

    return {
      overview: this.asString(parsed.overview),
      keyDecisions: this.asStringArray(parsed.keyDecisions),
      actionItems: this.asStringArray(parsed.actionItems),
      unresolvedTopics: this.asStringArray(parsed.unresolvedTopics),
      generatedAt: new Date().toISOString(),
      provider: this.name,
    };
  }

  private buildPrompt(context: ConversationSummaryContext): string {
    const periodLabel =
      context.periodType === 'daily'
        ? 'today'
        : context.periodType === 'weekly'
          ? 'this week'
          : 'the full conversation';

    const transcript = context.messages
      .map((m) => `${m.user}: ${m.text}`)
      .join('\n');

    return [
      `Channel: ${context.channelName ?? context.channelId}`,
      `Members: ${context.memberCount}`,
      `Period: ${periodLabel} (${context.periodStart} to ${context.periodEnd})`,
      `Message count: ${context.messages.length}`,
      '',
      'Transcript:',
      transcript || '(no messages in this period)',
      '',
      'Produce the summary JSON now.',
    ].join('\n');
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) =>
      typeof item === 'string' ? item : String(item ?? ''),
    );
  }
}
