import { Injectable, Logger } from '@nestjs/common';
import {
  SmartReplyContext,
  SmartReplyProvider,
  SmartReplyResult,
} from '../smart-reply.provider';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * OpenAI-compatible provider for smart replies. Used when AI_PROVIDER=openai
 * and OPENAI_API_KEY are configured. Talks to the /chat/completions endpoint
 * via fetch so no extra runtime dependency is needed; OPENAI_BASE_URL can
 * point at any compatible gateway.
 */
@Injectable()
export class OpenAiSmartReplyProvider implements SmartReplyProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiSmartReplyProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async generate(context: SmartReplyContext): Promise<SmartReplyResult> {
    const prompt = this.buildPrompt(context);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        max_tokens: 160,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: this.systemPrompt(),
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

    const parsed = this.parse(content);
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    if (suggestions.length === 0) {
      this.logger.warn(
        `AI provider returned no smart replies for channel ${context.channelId}`,
      );
    }

    return {
      suggestions: suggestions.slice(0, 5),
      provider: this.name,
    };
  }

  private parse(content: string): { suggestions?: unknown } {
    try {
      return JSON.parse(content) as { suggestions?: unknown };
    } catch {
      this.logger.warn(
        `AI provider returned non-JSON content, falling back: ${content.slice(0, 200)}`,
      );
      const lines = content
        .split('\n')
        .map((line) => line.replace(/^[-*\d.]+\s*/, '').trim())
        .filter((line) => line.length > 0);
      return { suggestions: lines };
    }
  }

  private buildPrompt(context: SmartReplyContext): string {
    // Oldest first so the model reads the conversation the way a person would,
    // with the latest exchange (the thing being replied to) at the end.
    const chronological = [...context.messages].reverse();

    const transcript = chronological
      .map((m) => {
        const speaker = m.userId
          ? m.userId === context.requesterId
            ? 'You'
            : `${m.user} (${m.userId})`
          : m.user;
        return `${speaker}: ${m.text}`;
      })
      .join('\n');

    const latestFromOthers = chronological
      .slice(-8)
      .filter((m) => m.userId !== context.requesterId)
      .map((m) => m.text)
      .filter((t) => t.trim().length > 0)
      .pop();

    return [
      `Channel: ${context.channelName ?? context.channelId}`,
      `Your user id: ${context.requesterId ?? 'unknown'}`,
      `Message count analyzed: ${context.messages.length}`,
      '',
      'Transcript (oldest first):',
      transcript || '(no messages in this period)',
      '',
      latestFromOthers
        ? `The most recent message from someone else to respond to is: "${latestFromOthers}"`
        : 'The latest message was written by you, so respond to the overall conversation or acknowledge it.',
      '',
      'Produce the smart reply JSON now.',
    ].join('\n');
  }

  private systemPrompt(): string {
    return [
      'You write context-aware chat reply suggestions for a professional messaging app.',
      'Respond with valid JSON only, using this exact shape: {"suggestions": string[]}.',
      'Return 3 to 5 concise, natural suggestions (under 60 characters each).',
      'Ground every suggestion in the actual conversation: echo the topic, answer the',
      'question, acknowledge the request or update, and pick up the thread being discussed.',
      'Speak as "You" (the channel member viewing the chat) in a first-person, natural tone.',
      'Do NOT invent people, projects, or facts that are not in the transcript and do not',
      'use generic filler unless nothing in the transcript gives you something to work with.',
      'If there is nothing to reply to, return an empty array.',
    ].join(' ');
  }
}
