import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Persisted AI summaries of chat conversations. One row exists per
 * (channel, period type, period start) so daily/weekly summaries accumulate
 * over time while regenerating the same period simply overwrites it. The
 * summary content itself is produced by the configured
 * ConversationSummaryProvider (mock by default, OpenAI-compatible when
 * AI_PROVIDER=openai is set).
 */
export const conversationSummaries = pgTable(
  'conversation_summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelId: varchar('channel_id', { length: 255 }).notNull(),
    periodType: varchar('period_type', { length: 255 }).notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    overview: text('overview').notNull(),
    keyDecisions: jsonb('key_decisions').$type<string[]>().notNull(),
    actionItems: jsonb('action_items').$type<string[]>().notNull(),
    unresolvedTopics: jsonb('unresolved_topics').$type<string[]>().notNull(),
    messageCount: integer('message_count').notNull().default(0),
    provider: varchar('provider', { length: 255 }).notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('conversation_summaries_period_unique').on(
      table.channelId,
      table.periodType,
      table.periodStart,
    ),
  ],
);

export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type NewConversationSummary = typeof conversationSummaries.$inferInsert;
