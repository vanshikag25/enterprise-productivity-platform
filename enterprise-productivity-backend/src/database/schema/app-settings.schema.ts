import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

/**
 * Simple key/value store for application-level settings (e.g. feature
 * toggles). One row exists per setting key; values are stored as JSON so
 * boolean, string, and numeric settings share the same table.
 */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;