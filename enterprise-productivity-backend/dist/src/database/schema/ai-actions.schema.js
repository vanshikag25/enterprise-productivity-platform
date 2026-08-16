"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiActionDismissals = exports.aiDetectedActions = exports.aiActionStatusEnum = exports.aiActionIntentTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.aiActionIntentTypeEnum = (0, pg_core_1.pgEnum)('ai_action_intent_type', [
    'task',
    'meeting',
    'deadline',
    'reminder',
    'decision',
    'follow_up',
]);
exports.aiActionStatusEnum = (0, pg_core_1.pgEnum)('ai_action_status', [
    'pending',
    'created',
]);
exports.aiDetectedActions = (0, pg_core_1.pgTable)('ai_detected_actions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }).notNull(),
    messageId: (0, pg_core_1.varchar)('message_id', { length: 255 }).notNull(),
    senderId: (0, pg_core_1.varchar)('sender_id', { length: 255 }),
    channelName: (0, pg_core_1.varchar)('channel_name', { length: 255 }),
    intentType: (0, exports.aiActionIntentTypeEnum)('intent_type').notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 512 }).notNull(),
    summary: (0, pg_core_1.text)('summary'),
    confidence: (0, pg_core_1.numeric)('confidence', { precision: 3, scale: 2 }),
    sourceMessageText: (0, pg_core_1.text)('source_message_text'),
    meta: (0, pg_core_1.jsonb)('meta').$type(),
    status: (0, exports.aiActionStatusEnum)('status').notNull().default('pending'),
    createdById: (0, pg_core_1.varchar)('created_by', { length: 255 }),
    resolvedEntityType: (0, pg_core_1.varchar)('resolved_entity_type', { length: 50 }),
    resolvedEntityId: (0, pg_core_1.varchar)('resolved_entity_id', { length: 255 }),
    resolutionNote: (0, pg_core_1.text)('resolution_note'),
    detectedAt: (0, pg_core_1.timestamp)('detected_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('ai_detected_actions_message_intent_idx').on(table.messageId, table.intentType),
]);
exports.aiActionDismissals = (0, pg_core_1.pgTable)('ai_action_dismissals', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    actionId: (0, pg_core_1.uuid)('action_id')
        .notNull()
        .references(() => exports.aiDetectedActions.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('ai_action_dismissals_user_idx').on(table.actionId, table.userId),
]);
//# sourceMappingURL=ai-actions.schema.js.map