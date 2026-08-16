import { Injectable, Logger } from '@nestjs/common';
import {
  NL_SEARCH_SOURCES,
  NlSearchContext,
  NlSearchProvider,
  NlSearchProviderResult,
} from '../nl-search.provider';
import { toValidIso } from '../date-utils';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface RawIntent {
  keywords?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  users?: unknown;
  channels?: unknown;
  sources?: unknown;
  intent?: unknown;
}

/** Normalizes a possibly-malformed array of strings, capped at `max`. */
function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    items.push(trimmed);
    if (items.length >= max) break;
  }
  return items;
}

/**
 * OpenAI-compatible intent parser for natural-language search. Used when
 * AI_PROVIDER=openai and OPENAI_API_KEY are configured. Talks to the
 * /chat/completions endpoint via fetch (no extra runtime dependency);
 * OPENAI_BASE_URL can point at any compatible gateway.
 */
@Injectable()
export class OpenAiNlSearchProvider implements NlSearchProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiNlSearchProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async parse(context: NlSearchContext): Promise<NlSearchProviderResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        max_tokens: 400,
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

    let raw: RawIntent;
    try {
      raw = JSON.parse(content) as RawIntent;
    } catch {
      this.logger.warn(
        `AI provider returned non-JSON content, falling back: ${content.slice(0, 200)}`,
      );
      raw = {};
    }

    return this.normalize(context, raw);
  }

  private normalize(
    context: NlSearchContext,
    raw: RawIntent,
  ): NlSearchProviderResult {
    const availableChannels = new Set(
      (context.channelNames ?? [])
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean),
    );
    const availableUsers = new Set(
      (context.userNames ?? [])
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean),
    );
    const validSources = new Set<string>(NL_SEARCH_SOURCES);

    const keywords = asStringArray(raw.keywords, 6);
    const startDate = toValidIso(raw.startDate);
    const endDate = toValidIso(raw.endDate);

    // Ground user/channel picks in what the requester can actually access so
    // hallucinated filters never restrict results unexpectedly.
    const users = asStringArray(raw.users, 10).filter((u) =>
      availableUsers.has(u.toLowerCase()),
    );
    const channels = asStringArray(raw.channels, 10).filter((c) =>
      availableChannels.has(c.toLowerCase()),
    );
    const sources = asStringArray(raw.sources, NL_SEARCH_SOURCES.length).filter(
      (s) => validSources.has(s.toLowerCase()),
    );

    const intent =
      typeof raw.intent === 'string' && raw.intent.trim()
        ? raw.intent.trim().slice(0, 60)
        : 'find';

    // Everything broad by default if the model was shy about picking scopes.
    const resolvedSources = sources.length > 0 ? sources : ['chat'];

    return {
      keywords,
      startDate,
      endDate,
      users,
      channels,
      sources: resolvedSources,
      intent,
      provider: this.name,
    };
  }

  private buildPrompt(context: NlSearchContext): string {
    return [
      `Query: "${context.query}"`,
      `Current time: ${context.nowIso}`,
      '',
      `Channels the requester can access: ${
        context.channelNames.length
          ? context.channelNames.join(', ')
          : '(none provided)'
      }`,
      `Users in the directory: ${
        context.userNames.length
          ? context.userNames.join(', ')
          : '(none provided)'
      }`,
      '',
      'Return the parsing JSON now.',
    ].join('\n');
  }

  private systemPrompt(): string {
    return [
      'You turn free-form search queries into structured search intents for a',
      'professional messaging/productivity platform.',
      '',
      'Respond with valid JSON only in this exact shape:',
      '{"keywords": string[], "startDate": string|null, "endDate": string|null,',
      ' "users": string[], "channels": string[], "sources": string[], "intent": string}.',
      '',
      'Rules:',
      '- keywords: 1-6 search terms capturing the topic (e.g. "authentication",',
      '  "login bug"). Keep the original casing for acronyms.',
      '- Dates: resolve relative phrases into ABSOLUTE ISO-8601 strings based on',
      '  the Current time provided. "today", "yesterday", "last week", "this',
      '  month", "last month", "past 7 days" etc. startDate is the window start',
      '  (inclusive), endDate the window end (inclusive), or null when the query',
      '  has no time restriction.',
      '- users/channels: ONLY pick values from the lists provided, preserving',
      '  their exact spelling. Empty array when none are mentioned.',
      '- sources: pick only from: chat, tasks, meetings, announcements, projects,',
      '  milestones, departments. Map chat messages/conversations to "chat". Default',
      '  to ["chat"] plus any others mentioned.',
      '- intent: a short label such as "find discussion" or "find decisions".',
      'Return only the JSON object, nothing else.',
    ].join('\n');
  }
}