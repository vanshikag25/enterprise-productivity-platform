import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.schema';

export const projectAnnouncements = pgTable('project_announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projectAnnouncementReactions = pgTable(
  'project_announcement_reactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => projectAnnouncements.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull(),
    emoji: varchar('emoji', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('project_announcement_reactions_unique_idx').on(
      table.announcementId,
      table.userId,
      table.emoji,
    ),
  ],
);

export type ProjectAnnouncement = typeof projectAnnouncements.$inferSelect;
export type NewProjectAnnouncement = typeof projectAnnouncements.$inferInsert;
export type ProjectAnnouncementReaction =
  typeof projectAnnouncementReactions.$inferSelect;
