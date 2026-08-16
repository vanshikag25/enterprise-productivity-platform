import {
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const aiActionIntentTypeEnum = pgEnum('ai_action_intent_type', [
  'task',
  'meeting',
  'deadline',
  'reminder',
  'decision',
  'follow_up',
]);

export const aiActionStatusEnum = pgEnum('ai_action_status', [
  'pending',
  'created',
]);

/**
 * An intent detected by the AI action-detection service on a chat message.
 * One row per (message, intent type) so the same suggestion is never stored
 * twice; the unique index below guarantees idempotency on re-analysis.
 */
export const aiDetectedActions = pgTable(
  'ai_detected_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelId: varchar('channel_id', { length: 255 }).notNull(),
    messageId: varchar('message_id', { length: 255 }).notNull(),
    senderId: varchar('sender_id', { length: 255 }),
    channelName: varchar('channel_name', { length: 255 }),
    intentType: aiActionIntentTypeEnum('intent_type').notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    summary: text('summary'),
    confidence: numeric('confidence', { precision: 3, scale: 2 }),
    sourceMessageText: text('source_message_text'),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    status: aiActionStatusEnum('status').notNull().default('pending'),
    createdById: varchar('created_by', { length: 255 }),
    resolvedEntityType: varchar('resolved_entity_type', { length: 50 }),
    resolvedEntityId: varchar('resolved_entity_id', { length: 255 }),
    resolutionNote: text('resolution_note'),
    detectedAt: timestamp('detected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('ai_detected_actions_message_intent_idx').on(
      table.messageId,
      table.intentType,
    ),
  ],
);

/** Per-user dismissal of a detected action, so one member hiding a card does
 * not hide it for everyone else in the channel. */
export const aiActionDismissals = pgTable(
  'ai_action_dismissals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actionId: uuid('action_id')
      .notNull()
      .references(() => aiDetectedActions.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('ai_action_dismissals_user_idx').on(
      table.actionId,
      table.userId,
    ),
  ],
);

export type AiDetectedAction = typeof aiDetectedActions.$inferSelect;
export type NewAiDetectedAction = typeof aiDetectedActions.$inferInsert;
export type AiActionDismissal = typeof aiActionDismissals.$inferSelect;
export type NewAiActionDismissal = typeof aiActionDismissals.$inferInsert;
