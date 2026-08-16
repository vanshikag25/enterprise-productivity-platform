import { Injectable } from '@nestjs/common';
import {
  SmartReplyContext,
  SmartReplyProvider,
  SmartReplyResult,
} from '../smart-reply.provider';

const GRATITUDE_HINTS = [
  'thanks',
  'thank you',
  'appreciate',
  'thanks a lot',
  'thankyou',
  'cheers',
  'grateful',
];

const CONCERN_HINTS = [
  "don't agree",
  'disagree',
  'i disagree',
  'not sure about that',
  "that doesn't work",
  'i have concerns',
  'concerned',
  'worried',
];

const AGREEMENT_HINTS = [
  'sounds good',
  'agreed',
  'agree',
  'works for me',
  "let's do it",
  'on board',
  'great idea',
  'looks good',
  'perfect',
  'go ahead',
  'sounds right',
];

const ACTION_HINTS = [
  'can you',
  'could you',
  'will you',
  'would you',
  'please',
  'need you to',
  'remind me',
  'schedule',
  'send me',
  'review',
  'look into',
  'fix',
  'update me',
  'let me know',
  'take care of',
];

const UPDATE_HINTS = [
  'done',
  'finished',
  'completed',
  'shipped',
  'deployed',
  'updated',
  'ready',
  'progress',
  'wrapping up',
  'pushed',
];

const STOP_WORDS = new Set([
  'please',
  'can',
  'could',
  'you',
  'will',
  'would',
  'should',
  'need',
  'want',
  'have',
  'with',
  'about',
  'what',
  'when',
  'where',
  'who',
  'why',
  'does',
  'did',
  'for',
  'from',
  'are',
  'was',
  'your',
  'this',
  'that',
  'them',
  'there',
  'they',
  'going',
  'gonna',
  'some',
  'any',
  'the',
  'and',
  'but',
  'not',
  'lot',
  'much',
  'very',
  'really',
  'just',
  'now',
  'soon',
  'today',
  'tomorrow',
  'later',
  'time',
  'call',
  'send',
  'let',
  'know',
  'see',
  'get',
  'make',
  'take',
  'give',
  'work',
  'done',
  'going',
  'back',
  'still',
  'also',
  'into',
]);

type Intent =
  | 'question'
  | 'action'
  | 'thanks'
  | 'greeting'
  | 'concern'
  | 'confirmation'
  | 'update'
  | 'acknowledgement';

function contains(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function endsWithQuestion(text: string): boolean {
  return text.trim().endsWith('?');
}

function nonEmptyMessages(context: SmartReplyContext) {
  return context.messages.filter((m) => m.text.trim().length > 0);
}

interface TopicExtraction {
  topic: string | null;
  fromDeterminer: boolean;
}

/**
 * Extracts the noun phrase most likely to be the subject of a message (e.g
 * "the PR", "our migration", "the budget"), preserving the original casing so
 * acronyms stay intact. Prefers the final determiner phrase (e.g. "budget" in
 * "what is the status of the budget?") and falls back to the first salient
 * content word so suggestions can reference what is actually being discussed.
 */
function extractTopic(text: string): TopicExtraction {
  const cleaned = text
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let determinerTopic: string | null = null;
  const determinerRegex =
    /(?:\bthe\b|\bmy\b|\bour\b|\byour\b|\bthis\b|\bthat\b|\ba\b|\ban\b)\s+([A-Za-z][A-Za-z0-9-]{1,})/g;
  let match: RegExpExecArray | null;
  while ((match = determinerRegex.exec(cleaned)) !== null) {
    determinerTopic = match[1]; // keep the last (most specific) match.
  }
  if (determinerTopic) return { topic: determinerTopic, fromDeterminer: true };

  const words = cleaned.split(/\s+/).filter((word) => {
    const lower = word.toLowerCase();
    return word.length >= 4 && !STOP_WORDS.has(lower);
  });
  const first = words[0];
  if (!first) return { topic: null, fromDeterminer: false };
  const topic = first === first.toUpperCase() ? first : first.toLowerCase();
  return { topic, fromDeterminer: false };
}

@Injectable()
export class MockSmartReplyProvider implements SmartReplyProvider {
  readonly name = 'mock';

  async generate(context: SmartReplyContext): Promise<SmartReplyResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Messages arrive newest-first (service comment). Reply to the latest
    // message that was NOT written by the requesting user, so suggestions
    // answer the other person instead of echoing the user's own words.
    const others = nonEmptyMessages(context).filter(
      (m) => m.userId !== context.requesterId,
    );
    const poolSource = others[0] ?? nonEmptyMessages(context)[0];

    if (!poolSource) {
      return { suggestions: [], provider: this.name };
    }

    const messages = nonEmptyMessages(context); // newest first.
    const recent = messages.slice(0, 4);
    const sourceTopic = extractTopic(poolSource.text);
    const recencyRank = new Map<string, number>();
    for (const m of recent) {
      const topic = extractTopic(m.text);
      if (topic.topic) {
        recencyRank.set(topic.topic, (recencyRank.get(topic.topic) ?? 0) + 1);
      }
    }
    // Tie-break by recency: among equally frequent topics, prefer the one that
    // appears in the newest message first.
    const rankedTopics = [...recencyRank.entries()].sort(
      (a, b) =>
        b[1] - a[1] ||
        this.newestIndexFor(recent, a[0]) - this.newestIndexFor(recent, b[0]),
    );
    const topic = sourceTopic.topic ?? rankedTopics[0]?.[0] ?? null;

    const intent = this.classify(poolSource.text);
    // Only reference the topic in replies when it's a clear noun phrase; a
    // bare fallback word (e.g. "status", "sounds") reads unnaturally.
    const mayReferenceTopic =
      intent === 'action' || intent === 'question' || intent === 'update';
    const pool = this.buildPool(
      intent,
      mayReferenceTopic || sourceTopic.fromDeterminer ? topic : null,
    );
    const seed = poolSource.createdAt
      ? new Date(poolSource.createdAt).getTime()
      : poolSource.text.length;
    const count = Math.min(
      pool.length,
      3 + Math.min(2, Math.floor(messages.length / 4)),
    );
    const start = seed % pool.length;
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];

    return {
      suggestions: rotated.slice(0, count).map((text) => this.shorten(text)),
      provider: this.name,
    };
  }

  /**
   * Classifies the intent of the latest message from the actual text so the
   * generated replies respond to what was said instead of generic filler.
   */
  private classify(text: string): Intent {
    const trimmed = text.trim();
    if (!trimmed) return 'acknowledgement';

    const lower = text.toLowerCase();

    if (
      /^(hi|hello|hey|yo)\b/i.test(trimmed) &&
      trimmed.split(/\s+/).length <= 4
    ) {
      return 'greeting';
    }
    if (contains(lower, GRATITUDE_HINTS)) return 'thanks';
    // Requests phrased as questions ("Can you review the PR?", "Could you
    // send me the report?") are actions, not curiosity questions.
    if (
      ACTION_HINTS.some((hint) => lower.includes(hint)) ||
      /^(can|could|will|would|please)\b/i.test(trimmed)
    ) {
      return 'action';
    }
    if (endsWithQuestion(trimmed)) return 'question';
    if (contains(lower, CONCERN_HINTS)) return 'concern';
    if (contains(lower, AGREEMENT_HINTS)) return 'confirmation';
    if (contains(lower, UPDATE_HINTS)) return 'update';

    return 'acknowledgement';
  }

  private newestIndexFor(
    messages: Array<{ text: string }>,
    topic: string,
  ): number {
    return messages.findIndex((m) => extractTopic(m.text).topic === topic);
  }

  /**
   * Builds reply candidates that are anchored to the detected conversation
   * topic and the applicable intent, so the suggestions stay relevant to the
   * chat even without a hosted LLM.
   */
  private buildPool(intent: Intent, topic: string | null): string[] {
    const about = topic ? ` on ${topic}` : '';
    switch (intent) {
      case 'question':
        return topic
          ? [
              `Good question — let me check and get back to you about ${topic}.`,
              `I believe so, but let me confirm first.`,
              `Let me look into ${topic} and update you shortly.`,
              `Not sure yet — I'll verify ${topic} for you.`,
            ]
          : [
              'Good question — let me look into it.',
              'I believe so, but let me confirm first.',
              'Not sure yet — I will get back to you.',
              'Let me check and follow up.',
            ];
      case 'action':
        return topic
          ? [
              `Sure, I'll take care of ${topic}.`,
              `On it — I'll handle ${topic} now.`,
              `Happy to help with ${topic}.`,
              `Consider it done — I'll update you${about}.`,
            ]
          : [
              'Sure, I can take care of that.',
              'On it — will update you shortly.',
              'Happy to help with that.',
              'No problem — I will handle it.',
            ];
      case 'thanks':
        return [
          "You're welcome — happy to help.",
          'Anytime — glad I could help.',
          'No worries at all.',
          'It was my pleasure.',
        ];
      case 'greeting':
        return [
          'Hey — how are you?',
          'Good to hear from you.',
          'Hi there — what’s up?',
          'Hey! How can I help?',
        ];
      case 'concern':
        return [
          'I actually have a few concerns I want to raise.',
          'Can we explore an alternative?',
          "Let me play devil's advocate for a moment.",
          'What trade-offs have we considered?',
        ];
      case 'confirmation':
        return topic
          ? [
              'Sounds good to me.',
              `Agreed — let's move forward with ${topic}.`,
              '+1 to that.',
              'Looks good from my side.',
            ]
          : [
              'Sounds good to me.',
              "Agreed — let's move forward.",
              '+1 to that.',
              'Looks good from my side.',
            ];
      case 'update':
        return topic
          ? [
              `Great — thanks for the update on ${topic}.`,
              'Thanks for keeping me posted.',
              'Good progress — appreciate it.',
              `Got it — noted${about}.`,
            ]
          : [
              'Great — thanks for the update.',
              'Thanks for keeping me posted.',
              'Good progress — appreciate it.',
              'Got it — noted.',
            ];
      case 'acknowledgement':
      default:
        return topic
          ? [
              'Got it — makes sense.',
              `Thanks for sharing — noted on ${topic}.`,
              'Sounds good to me.',
              'Happy to help if needed.',
            ]
          : [
              'Got it — makes sense.',
              'Sounds good to me.',
              'Happy to help if needed.',
            ];
    }
  }

  private shorten(text: string): string {
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  }
}
