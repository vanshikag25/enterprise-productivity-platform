import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Persisted AI message translations. One row exists per (message, target
 * language) so translating the same message twice is instant. The source hash
 * guards against stale results: if the underlying message is edited, the hash
 * stops matching and the row is refreshed on the next request.
 */
export const messageTranslations = pgTable(
  'message_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: varchar('message_id', { length: 255 }).notNull(),
    targetLanguage: varchar('target_language', { length: 64 }).notNull(),
    sourceHash: varchar('source_hash', { length: 64 }).notNull(),
    sourceText: text('source_text').notNull(),
    detectedSourceLanguage: varchar('detected_source_language', {
      length: 64,
    }),
    translatedText: text('translated_text').notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('message_translations_message_language_unique').on(
      table.messageId,
      table.targetLanguage,
    ),
  ],
);

export type MessageTranslation = typeof messageTranslations.$inferSelect;
export type NewMessageTranslation =
  typeof messageTranslations.$inferInsert;