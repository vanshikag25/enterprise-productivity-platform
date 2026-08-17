import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './users.schema';

export const moderationReportTargetEnum = pgEnum('moderation_report_target', [
  'message',
  'user',
]);

export const moderationReportStatusEnum = pgEnum('moderation_report_status', [
  'pending',
  'reviewing',
  'resolved',
  'dismissed',
]);

export const moderationActionTypeEnum = pgEnum('moderation_action_type', [
  'message_delete',
  'user_mute',
  'user_unmute',
  'member_remove',
  'user_ban',
  'user_unban',
  'channel_lock',
  'channel_unlock',
  'report_review',
  'report_resolve',
  'report_dismiss',
]);

export const moderationReports = pgTable(
  'moderation_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: varchar('reporter_id', { length: 255 }).notNull(),
    targetType: moderationReportTargetEnum('target_type').notNull(),
    targetMessageId: varchar('target_message_id', { length: 255 }),
    targetUserId: varchar('target_user_id', { length: 255 }),
    targetUserName: varchar('target_user_name', { length: 255 }),
    targetMessageText: text('target_message_text'),
    channelId: varchar('channel_id', { length: 255 }).notNull(),
    channelName: varchar('channel_name', { length: 255 }),
    reason: varchar('reason', { length: 255 }).notNull(),
    description: text('description'),
    status: moderationReportStatusEnum('status').notNull().default('pending'),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('moderation_reports_reporter_message_idx').on(
      table.reporterId,
      table.targetMessageId,
    ),
    uniqueIndex('moderation_reports_reporter_user_channel_idx').on(
      table.reporterId,
      table.targetUserId,
      table.channelId,
    ),
  ],
);

export const moderationActions = pgTable('moderation_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  moderatorId: varchar('moderator_id', { length: 255 }).notNull(),
  moderatorRole: userRoleEnum('moderator_role').notNull(),
  actionType: moderationActionTypeEnum('action_type').notNull(),
  targetUserId: varchar('target_user_id', { length: 255 }),
  targetMessageId: varchar('target_message_id', { length: 255 }),
  channelId: varchar('channel_id', { length: 255 }),
  reason: varchar('reason', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ModerationReport = typeof moderationReports.$inferSelect;
export type ModerationReportTarget =
  (typeof moderationReportTargetEnum.enumValues)[number];
export type ModerationReportStatus =
  (typeof moderationReportStatusEnum.enumValues)[number];
export type ModerationAction = typeof moderationActions.$inferSelect;
export type ModerationActionType =
  (typeof moderationActionTypeEnum.enumValues)[number];
