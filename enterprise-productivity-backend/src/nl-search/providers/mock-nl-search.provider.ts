import { Injectable } from '@nestjs/common';
import {
  NL_SEARCH_SOURCES,
  NlSearchContext,
  NlSearchProvider,
  NlSearchProviderResult,
} from '../nl-search.provider';
import {
  resolveRelativeDateRange,
  toValidIso,
} from '../date-utils';

const STOP_WORDS = new Set([
  'about', 'show', 'find', 'search', 'please', 'look', 'see', 'the', 'this',
  'that', 'these', 'those', 'from', 'with', 'and', 'for', 'are', 'was',
  'were', 'have', 'has', 'had', 'is', 'in', 'on', 'at', 'by', 'of', 'to',
  'you', 'your', 'them', 'they', 'their', 'there', 'it', 'its', 'we', 'our',
  'us', 'me', 'my', 'into', 'over', 'under', 'what', 'when', 'where', 'who',
  'how', 'does', 'did', 'do', 'any', 'some', 'all', 'discussed',
  'discussing', 'discussion', 'discussions', 'conversation', 'conversations',
  'messages', 'message', 'channel', 'channels', 'chat', 'chats', 'happened',
  'happening', 'recent', 'recently', 'since', 'earlier', 'last', 'week',
  'month', 'year', 'day', 'days', 'weeks', 'months', 'years', 'weekend',
  'today', 'yesterday', 'past', 'previous', 'ago',
]);

const INTENT_RULES: Array<{ hints: string[]; intents: string }> = [
  { hints: ['decided', 'decision', 'decisions', 'agreed', 'decide'], intents: 'find decisions' },
  { hints: ['status', 'progress', 'update', 'updates', 'updated'], intents: 'find status update' },
  { hints: ['bug', 'error', 'issue', 'problem', 'broken', 'failing', 'failed'], intents: 'find problem report' },
  { hints: ['discuss', 'discussion', 'discussed', 'talked', 'said', 'about'], intents: 'find discussion' },
  { hints: ['recent', 'newly', 'latest', 'newest', 'since'], intents: 'recent' },
];

/** Splits a query into candidate keyword tokens, dropping noise. */
function extractKeywords(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^\w@\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^@/, ''))
    .filter(
      (t) =>
        t.length >= 3 &&
        !STOP_WORDS.has(t) &&
        !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/.test(t),
    );
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
    }
  }
  return unique.slice(0, 6);
}

/** Detects content scopes mentioned in the query against the fixed vocabulary. */
function extractSources(query: string): string[] {
  const lower = query.toLowerCase();
  const matched = new Set<string>();
  if (/\bannouncements?\b/.test(lower)) matched.add('announcements');
  if (/\bmeetings?\b|\bcalendar\b/.test(lower)) matched.add('meetings');
  if (/\btasks?\b|\bto-?do\b/.test(lower)) matched.add('tasks');
  if (/\bprojects?\b/.test(lower)) matched.add('projects');
  if (/\bmilestones?\b/.test(lower)) matched.add('milestones');
  if (/\bdepartments?\b|\bteam channel\b/.test(lower)) matched.add('departments');
  if (/\bchat|conversations?|messages?|discussions?\b|\bchannel\b/.test(lower)) {
    matched.add('chat');
  }
  // Nothing explicit: assume the broad chat scope.
  if (matched.size === 0) matched.add('chat');
  return [...matched];
}

function extractIntent(query: string): string {
  const lower = query.toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.hints.some((hint) => lower.includes(hint))) return rule.intents;
  }
  return 'find';
}

/**
 * Deterministic, offline intent parser. Mirrors the JSON contract of the
 * OpenAI provider so the rest of the pipeline is identical either way and
 * the feature works with AI_PROVIDER=mock (the default).
 */
@Injectable()
export class MockNlSearchProvider implements NlSearchProvider {
  readonly name = 'mock';

  async parse(context: NlSearchContext): Promise<NlSearchProviderResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const range = resolveRelativeDateRange(context.query, context.nowIso);

    const channels: string[] = [];
    const queryLower = context.query.toLowerCase();
    for (const name of context.channelNames ?? []) {
      if (name && queryLower.includes(name.toLowerCase())) {
        channels.push(name);
      }
    }

    const users: string[] = [];
    for (const name of context.userNames ?? []) {
      if (name && queryLower.includes(name.toLowerCase())) {
        users.push(name);
      }
    }

    return {
      keywords: extractKeywords(context.query),
      startDate: range ? toValidIso(range.startDate) : null,
      endDate: range ? toValidIso(range.endDate) : null,
      users,
      channels,
      sources: extractSources(context.query),
      intent: extractIntent(context.query),
      provider: this.name,
    };
  }
}