import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const meetingStatusEnum = pgEnum('meeting_status', [
  'Scheduled',
  'Ongoing',
  'Completed',
  'Cancelled',
]);

export const meetings = pgTable('meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(), // "HH:mm"
  endTime: varchar('end_time', { length: 5 }).notNull(),
  organizerId: varchar('organizer_id', { length: 255 }).notNull(),
  participants: jsonb('participants').$type<string[]>().notNull().default([]),
  meetingStatus: meetingStatusEnum('meeting_status')
    .notNull()
    .default('Scheduled'),
  meetingChatChannelId: varchar('meeting_chat_channel_id', { length: 255 }),
  sourceChannelId: varchar('source_channel_id', { length: 255 }),
  sourceMessageId: varchar('source_message_id', { length: 255 }),
  sourceSenderId: varchar('source_sender_id', { length: 255 }),
  sourceChannelName: varchar('source_channel_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
