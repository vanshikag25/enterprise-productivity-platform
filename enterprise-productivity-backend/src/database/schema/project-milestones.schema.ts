import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.schema';

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'planned',
  'in_progress',
  'completed',
  'delayed',
]);

export const projectMilestones = pgTable('project_milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  ownerId: varchar('owner_id', { length: 255 }),
  status: milestoneStatusEnum('status').notNull().default('planned'),
  progress: integer('progress').notNull().default(0),
  streamChannelId: varchar('stream_channel_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type NewProjectMilestone = typeof projectMilestones.$inferInsert;
export type MilestoneStatus = (typeof milestoneStatusEnum.enumValues)[number];
