"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderationActions = exports.moderationReports = exports.moderationActionTypeEnum = exports.moderationReportStatusEnum = exports.moderationReportTargetEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.moderationReportTargetEnum = (0, pg_core_1.pgEnum)('moderation_report_target', [
    'message',
    'user',
]);
exports.moderationReportStatusEnum = (0, pg_core_1.pgEnum)('moderation_report_status', [
    'pending',
    'reviewing',
    'resolved',
    'dismissed',
]);
exports.moderationActionTypeEnum = (0, pg_core_1.pgEnum)('moderation_action_type', [
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
exports.moderationReports = (0, pg_core_1.pgTable)('moderation_reports', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    reporterId: (0, pg_core_1.varchar)('reporter_id', { length: 255 }).notNull(),
    targetType: (0, exports.moderationReportTargetEnum)('target_type').notNull(),
    targetMessageId: (0, pg_core_1.varchar)('target_message_id', { length: 255 }),
    targetUserId: (0, pg_core_1.varchar)('target_user_id', { length: 255 }),
    targetUserName: (0, pg_core_1.varchar)('target_user_name', { length: 255 }),
    targetMessageText: (0, pg_core_1.text)('target_message_text'),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }).notNull(),
    channelName: (0, pg_core_1.varchar)('channel_name', { length: 255 }),
    reason: (0, pg_core_1.varchar)('reason', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, exports.moderationReportStatusEnum)('status').notNull().default('pending'),
    reviewedBy: (0, pg_core_1.varchar)('reviewed_by', { length: 255 }),
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at', { withTimezone: true }),
    resolutionNote: (0, pg_core_1.text)('resolution_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('moderation_reports_reporter_message_idx').on(table.reporterId, table.targetMessageId),
    (0, pg_core_1.uniqueIndex)('moderation_reports_reporter_user_channel_idx').on(table.reporterId, table.targetUserId, table.channelId),
]);
exports.moderationActions = (0, pg_core_1.pgTable)('moderation_actions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    moderatorId: (0, pg_core_1.varchar)('moderator_id', { length: 255 }).notNull(),
    moderatorRole: (0, users_schema_1.userRoleEnum)('moderator_role').notNull(),
    actionType: (0, exports.moderationActionTypeEnum)('action_type').notNull(),
    targetUserId: (0, pg_core_1.varchar)('target_user_id', { length: 255 }),
    targetMessageId: (0, pg_core_1.varchar)('target_message_id', { length: 255 }),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }),
    reason: (0, pg_core_1.varchar)('reason', { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=moderation.schema.js.map