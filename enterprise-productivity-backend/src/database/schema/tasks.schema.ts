import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const taskStatusEnum = pgEnum('task_status', [
  'Todo',
  'In Progress',
  'In Review',
  'Completed',
  'Closed',
]);
export const taskPriorityEnum = pgEnum('task_priority', [
  'Low',
  'Medium',
  'High',
  'Critical',
]);

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('Todo'),
  priority: taskPriorityEnum('priority').notNull().default('Medium'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  assignee: varchar('assignee', { length: 255 }),
  streamChannelId: varchar('stream_channel_id', { length: 255 }),
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

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
