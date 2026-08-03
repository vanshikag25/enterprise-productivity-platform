import {
  pgTable,
  uuid,
  varchar,
  bigint,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.schema';

export const projectDocuments = pgTable('project_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  uploaderId: varchar('uploader_id', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  storagePath: varchar('storage_path', { length: 1024 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type NewProjectDocument = typeof projectDocuments.$inferInsert;
