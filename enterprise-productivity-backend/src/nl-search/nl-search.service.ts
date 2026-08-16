import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { MessageResponse } from 'stream-chat';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import {
  NL_SEARCH_PROVIDER,
  NlSearchContext,
  NlSearchIntent,
  NlSearchProvider,
} from './nl-search.provider';
import { MockNlSearchProvider } from './providers/mock-nl-search.provider';

export interface NlSearchResultItem {
  id: string;
  /** Content scope: chat | tasks | meetings | announcements | projects | milestones | departments. */
  source: string;
  preview: string;
  senderId: string | null;
  senderName: string | null;
  senderImageUrl: string | null;
  channelId: string;
  channelName: string | null;
  createdAt: string;
  /** Deep link into the original conversation on the frontend. */
  url: string;
  matchedKeywords: string[];
}

export interface NlSearchResponse {
  query: string;
  intent: NlSearchIntent;
  provider: string;
  total: number;
  results: NlSearchResultItem[];
}

interface AccessibleChannel {
  id: string;
  cid: string;
  name: string | null;
  kind: string | null;
  memberCount: number;
}

interface DirectoryUser {
  username: string;
  name: string;
}

const SOURCE_BY_KIND: Record<string, string> = {
  task: 'tasks',
  project: 'projects',
  milestone: 'milestones',
  announcement: 'announcements',
  department: 'departments',
};

const CHANNEL_FETCH_LIMIT = 300;
const RESULTS_CAP = 30;
const MAX_KEYWORD_SEARCHES = 6;

/** Maps a channel kind / name to a content-scope label for display. */
function sourceFor(channel: AccessibleChannel): string {
  if (channel.kind && SOURCE_BY_KIND[channel.kind]) {
    return SOURCE_BY_KIND[channel.kind];
  }
  if (
    !channel.kind &&
    channel.name &&
    channel.name.toLowerCase().startsWith('meeting:')
  ) {
    return 'meetings';
  }
  return 'chat';
}

@Injectable()
export class NlSearchService {
  private readonly logger = new Logger(NlSearchService.name);

  constructor(
    private readonly streamService: StreamService,
    private readonly usersService: UsersService,
    @Inject(NL_SEARCH_PROVIDER) private readonly provider: NlSearchProvider,
  ) {}

  /**
   * Runs an AI natural-language search for the signed-in user. RBAC is
   * enforced twice: accessible channels are discovered via Stream channel
   * membership (queryChannels with `members: { $in: [userId] }`) and every
   * returned message is cross-checked against that allowed set, so results
   * can never leak content from channels the user is not a member of.
   */
  async search(userId: string, query: string): Promise<NlSearchResponse> {
    const nowIso = new Date().toISOString();
    const channels = await this.fetchAccessibleChannels(userId);
    const allowedByCid = new Map(channels.map((c) => [c.cid, c]));
    const allowedIds = new Set(channels.map((c) => c.cid.split(':')[1]));

    const directory = await this.loadDirectoryNames();
    const context: NlSearchContext = {
      query,
      nowIso,
      channelNames: channels
        .map((c) => c.name)
        .filter((n): n is string => Boolean(n)),
      userNames: directory.byUsername
        .map((u) => u.name)
        .filter((n): n is string => Boolean(n)),
    };

    const intent = await this.parseIntent(context);

    // Channel-level narrowing from AI picks. If the model narrowed to channels
    // the user mentioned, restrict to the accessible ones that match; a
    // mention of a channel the user cannot see must yield no results.
    let searchable = channels;
    if (intent.channels.length > 0) {
      const wanted = new Set(intent.channels.map((c) => c.toLowerCase()));
      searchable = channels.filter((c) =>
        c.name ? wanted.has(c.name.toLowerCase()) : false,
      );
      if (searchable.length === 0) {
        return {
          query,
          intent,
          provider: intent.provider,
          total: 0,
          results: [],
        };
      }
    }

    const cids = searchable.map((c) => c.cid).slice(0, 200);
    const messages = await this.fetchMessages(cids, intent);

    const results = this.enrich(
      messages,
      intent,
      allowedByCid,
      allowedIds,
      directory.byUsername,
    );

    return {
      query,
      intent,
      provider: intent.provider,
      total: results.length,
      results,
    };
  }

  private async parseIntent(context: NlSearchContext) {
    try {
      return await this.provider.parse(context);
    } catch (err) {
      this.logger.error(
        `AI intent parsing failed; using heuristic fallback: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Deterministic offline fallback so search still works on outage.
      return new MockNlSearchProvider().parse(context);
    }
  }

  private async fetchAccessibleChannels(
    userId: string,
  ): Promise<AccessibleChannel[]> {
    const response = await this.streamService
      .getClient()
      .queryChannels(
        { type: 'messaging', members: { $in: [userId] } },
        { last_message_at: -1 },
        { limit: CHANNEL_FETCH_LIMIT },
      );

    return response.map((channel) => {
      const data = (channel.data ?? {}) as Record<string, unknown>;
      const memberCount = Object.keys(
        (channel.state.members ?? {}) as Record<string, unknown>,
      ).length;
      const rawName = (data.name as string) ?? '';
      const name =
        rawName.trim() ||
        (memberCount <= 2 ? 'Direct message' : 'Conversation');
      const kind = (data.channel_kind as string) ?? null;
      return {
        id: channel.id ?? '',
        cid: channel.cid,
        name,
        kind,
        memberCount,
      };
    });
  }

  private async loadDirectoryNames() {
    const users = await this.usersService
      .findAllExcept('')
      .catch(() => []);
    const byUsername: DirectoryUser[] = users.map((u) => ({
      username: u.username,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
    }));
    return { byUsername };
  }

  private async fetchMessages(
    cids: string[],
    intent: NlSearchIntent,
  ): Promise<MessageResponse[]> {
    const client = this.streamService.getClient();
    const messageFilter: Record<string, unknown> = {};
    if (intent.startDate || intent.endDate) {
      messageFilter.created_at = {
        ...(intent.startDate ? { $gte: intent.startDate } : {}),
        ...(intent.endDate ? { $lte: intent.endDate } : {}),
      };
    }
    const channelFilter = { cid: { $in: cids } };
    const sort = { created_at: -1 } as const;
    const keywords = intent.keywords.slice(0, MAX_KEYWORD_SEARCHES);

    let fetched: MessageResponse[] = [];
    try {
      if (keywords.length > 0) {
        const batches = await Promise.all(
          keywords.map((keyword) =>
            client
              .search(
                channelFilter,
                {
                  ...messageFilter,
                  text: { $autocomplete: keyword },
                },
                { limit: 50, sort },
              )
              .catch(() => ({ results: [] })),
          ),
        );
        for (const batch of batches) {
          fetched.push(...batch.results.map((r) => r.message));
        }
      } else {
        const batch = await client.search(
          channelFilter,
          messageFilter,
          { limit: 50, sort },
        );
        fetched.push(...batch.results.map((r) => r.message));
      }
    } catch (err) {
      this.logger.error(
        `Stream message search failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    const seen = new Set<string>();
    const unique: MessageResponse[] = [];
    for (const message of fetched) {
      if (!message?.id || seen.has(message.id)) continue;
      seen.add(message.id);
      unique.push(message);
    }
    return unique;
  }

  private enrich(
    messages: MessageResponse[],
    intent: NlSearchIntent,
    allowedByCid: Map<string, AccessibleChannel>,
    allowedIds: Set<string>,
    directory: DirectoryUser[],
  ): NlSearchResultItem[] {
    const directoryByUser = new Map(
      directory.map((u) => [u.username, u.name] as const),
    );
    const expectedSources = new Set(
      intent.sources.map((s) => s.toLowerCase()),
    );
    const expectedChannels = new Set(
      intent.channels.map((c) => c.toLowerCase()),
    );
    const keywordLower = intent.keywords.map((k) => k.toLowerCase());

    const items: Array<NlSearchResultItem & { score: number }> = [];

    for (const message of messages) {
      const channel = this.resolveChannel(message, allowedByCid, allowedIds);
      if (!channel) continue;

      const text = (message.text ?? '').trim();
      if (!text) continue;
      if (message.type && message.type !== 'regular') continue;
      if (message.deleted_at) continue;

      const textLower = text.toLowerCase();
      const matchedKeywords = keywordLower.filter((k) =>
        textLower.includes(k),
      );

      const senderId = message.user?.id ?? null;
      const sender =
        message.user?.name ||
        (senderId ? directoryByUser.get(senderId) : undefined) ||
        null;

      const createdIso = message.created_at
        ? new Date(message.created_at).toISOString()
        : new Date().toISOString();

      const source = sourceFor(channel);

      let score = 0;
      score += matchedKeywords.length;
      if (matchedKeywords.length === keywordLower.length && keywordLower.length > 0) {
        score += 2;
      }
      if (channel.name) {
        const names = [channel.name.toLowerCase(), source];
        if (names.some((n) => expectedChannels.has(n))) score += 1;
      }
      if (expectedSources.has(source)) score += 1;
      if (channel.kind === 'announcement' || source === 'announcements') {
        score += 1; // surface announcements slightly above plain chatter.
      }

      items.push({
        id: message.id ?? '',
        source,
        preview: this.buildPreview(text, matchedKeywords),
        senderId,
        senderName: sender,
        senderImageUrl: message.user?.image ?? null,
        channelId: channel.id,
        channelName: channel.name,
        createdAt: createdIso,
        url: `/dashboard?channel=${encodeURIComponent(channel.id)}&message=${encodeURIComponent(message.id ?? '')}`,
        matchedKeywords,
        score,
      });
    }

    return items
      .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
      .slice(0, RESULTS_CAP)
      .map(({ score: _score, ...item }) => item);
  }

  private resolveChannel(
    message: MessageResponse,
    allowedByCid: Map<string, AccessibleChannel>,
    allowedIds: Set<string>,
  ): AccessibleChannel | null {
    const cid = message.cid;
    if (cid && allowedByCid.has(cid)) {
      return allowedByCid.get(cid) ?? null;
    }
    // Fallback: parent_id / channel link via message cid is normally always
    // present; if not, resolve via the id portion of the cid.
    if (cid) {
      const id = cid.split(':')[1];
      if (id && allowedIds.has(id)) {
        return { id, cid, name: 'Conversation', kind: null, memberCount: 0 };
      }
    }
    return null;
  }

  /** Builds a query-aware snippet: ~110 chars before and ~90 after the first match. */
  private buildPreview(
    text: string,
    matchedKeywords: string[],
  ): string {
    if (text.length <= 220) return text;

    let start = 0;
    if (matchedKeywords.length > 0) {
      const lower = text.toLowerCase();
      let firstHit = -1;
      for (const kw of matchedKeywords) {
        const idx = lower.indexOf(kw);
        if (idx >= 0) {
          firstHit = firstHit < 0 ? idx : Math.min(firstHit, idx);
        }
      }
      if (firstHit >= 0) {
        start = Math.max(0, firstHit - 110);
      }
    }
    const end = Math.min(text.length, start + 210);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < text.length ? '…' : '';
    return `${prefix}${text.slice(start, end)}${suffix}`;
  }
}