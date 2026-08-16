import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const entityCreationTypeEnum = pgEnum('entity_creation_type', [
  'task',
  'meeting',
]);

export const entityCreationStatusEnum = pgEnum('entity_creation_status', [
  'pending',
  'approved',
  'rejected',
]);

/**
 * A proposal to create a task or meeting from a member who lacks the
 * team_lead+ role. The requester fills in the entity form, a team lead
 * approves or rejects it from the relevant directory, and on approval the
 * real task/meeting is created with the requester as the owner.
 */
export const entityCreationRequests = pgTable(
  'entity_creation_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: entityCreationTypeEnum('entity_type').notNull(),
    status: entityCreationStatusEnum('status').notNull().default('pending'),
    title: varchar('title', { length: 512 }).notNull(),
    /** The CreateTaskDto/CreateMeetingDto fields (minus source refs). */
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdById: varchar('created_by', { length: 255 }).notNull(),
    sourceChannelId: varchar('source_channel_id', { length: 255 }),
    sourceMessageId: varchar('source_message_id', { length: 255 }),
    sourceSenderId: varchar('source_sender_id', { length: 255 }),
    sourceChannelName: varchar('source_channel_name', { length: 255 }),
    sourceMessageText: text('source_message_text'),
    reviewedById: varchar('reviewed_by', { length: 255 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [table.entityType, table.status, table.createdById],
);

export type EntityCreationRequest =
  typeof entityCreationRequests.$inferSelect;
export type NewEntityCreationRequest =
  typeof entityCreationRequests.$inferInsert;