import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Local bookkeeping for chat polls. Poll questions, options and votes live in
 * Stream Chat (created via the server SDK); this table only tracks what Stream
 * does not: deadline-based auto-close and closure state for notifications.
 */
export const polls = pgTable('polls', {
  id: uuid('id').defaultRandom().primaryKey(),
  streamPollId: varchar('stream_poll_id', { length: 255 }).notNull().unique(),
  channelId: varchar('channel_id', { length: 255 }).notNull(),
  messageId: varchar('message_id', { length: 255 }).notNull(),
  question: text('question').notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  deadline: timestamp('deadline', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
