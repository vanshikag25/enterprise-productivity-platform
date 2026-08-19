import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './users.schema';

export const auditActionTypeEnum = pgEnum('audit_action_type', [
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

export const auditResourceTypeEnum = pgEnum('audit_resource_type', [
  'message',
  'user',
  'channel',
  'project',
  'department',
  'workflow',
]);

/**
 * Append-only audit trail. Records are created with INSERT and are never
 * updated or deleted: the table exposes no update/delete paths, has no
 * `updatedAt` column, and a database trigger rejects UPDATE/DELETE statements.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actionType: auditActionTypeEnum('action_type').notNull(),
    actorId: varchar('actor_id', { length: 255 }).notNull(),
    actorRole: userRoleEnum('actor_role').notNull(),
    actorName: varchar('actor_name', { length: 512 }),
    targetUserId: varchar('target_user_id', { length: 255 }),
    targetUserName: varchar('target_user_name', { length: 512 }),
    resourceType: auditResourceTypeEnum('resource_type').notNull(),
    resourceId: varchar('resource_id', { length: 255 }),
    resourceName: varchar('resource_name', { length: 512 }),
    channelId: varchar('channel_id', { length: 255 }),
    projectId: varchar('project_id', { length: 255 }),
    previousValue: jsonb('previous_value').$type<Record<
      string,
      unknown
    > | null>(),
    newValue: jsonb('new_value').$type<Record<string, unknown> | null>(),
    reason: text('reason'),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_events_action_idx').on(table.actionType),
    index('audit_events_actor_idx').on(table.actorId),
    index('audit_events_target_user_idx').on(table.targetUserId),
    index('audit_events_channel_idx').on(table.channelId),
    index('audit_events_created_idx').on(table.createdAt),
  ],
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type AuditActionType = (typeof auditActionTypeEnum.enumValues)[number];
export type AuditResourceType =
  (typeof auditResourceTypeEnum.enumValues)[number];
