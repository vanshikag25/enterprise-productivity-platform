"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditEvents = exports.auditResourceTypeEnum = exports.auditActionTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.auditActionTypeEnum = (0, pg_core_1.pgEnum)('audit_action_type', [
    'message_edit',
    'message_delete',
    'user_join',
    'user_leave',
    'member_remove',
    'role_change',
    'channel_create',
    'channel_delete',
    'moderator_action',
    'user_mute',
    'user_unmute',
    'user_ban',
    'user_unban',
    'channel_lock',
    'channel_unlock',
    'workflow_create',
    'workflow_update',
    'workflow_delete',
    'workflow_toggle',
    'workflow_execution',
]);
exports.auditResourceTypeEnum = (0, pg_core_1.pgEnum)('audit_resource_type', [
    'message',
    'user',
    'channel',
    'project',
    'department',
    'workflow',
]);
exports.auditEvents = (0, pg_core_1.pgTable)('audit_events', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    actionType: (0, exports.auditActionTypeEnum)('action_type').notNull(),
    actorId: (0, pg_core_1.varchar)('actor_id', { length: 255 }).notNull(),
    actorRole: (0, users_schema_1.userRoleEnum)('actor_role').notNull(),
    actorName: (0, pg_core_1.varchar)('actor_name', { length: 512 }),
    targetUserId: (0, pg_core_1.varchar)('target_user_id', { length: 255 }),
    targetUserName: (0, pg_core_1.varchar)('target_user_name', { length: 512 }),
    resourceType: (0, exports.auditResourceTypeEnum)('resource_type').notNull(),
    resourceId: (0, pg_core_1.varchar)('resource_id', { length: 255 }),
    resourceName: (0, pg_core_1.varchar)('resource_name', { length: 512 }),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }),
    projectId: (0, pg_core_1.varchar)('project_id', { length: 255 }),
    previousValue: (0, pg_core_1.jsonb)('previous_value').$type(),
    newValue: (0, pg_core_1.jsonb)('new_value').$type(),
    reason: (0, pg_core_1.text)('reason'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 64 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('audit_events_action_idx').on(table.actionType),
    (0, pg_core_1.index)('audit_events_actor_idx').on(table.actorId),
    (0, pg_core_1.index)('audit_events_target_user_idx').on(table.targetUserId),
    (0, pg_core_1.index)('audit_events_channel_idx').on(table.channelId),
    (0, pg_core_1.index)('audit_events_created_idx').on(table.createdAt),
]);
//# sourceMappingURL=audit-logs.schema.js.map