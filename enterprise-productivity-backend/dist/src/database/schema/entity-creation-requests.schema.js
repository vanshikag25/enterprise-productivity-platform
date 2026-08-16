"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityCreationRequests = exports.entityCreationStatusEnum = exports.entityCreationTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.entityCreationTypeEnum = (0, pg_core_1.pgEnum)('entity_creation_type', [
    'task',
    'meeting',
]);
exports.entityCreationStatusEnum = (0, pg_core_1.pgEnum)('entity_creation_status', [
    'pending',
    'approved',
    'rejected',
]);
exports.entityCreationRequests = (0, pg_core_1.pgTable)('entity_creation_requests', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    entityType: (0, exports.entityCreationTypeEnum)('entity_type').notNull(),
    status: (0, exports.entityCreationStatusEnum)('status').notNull().default('pending'),
    title: (0, pg_core_1.varchar)('title', { length: 512 }).notNull(),
    payload: (0, pg_core_1.jsonb)('payload').$type().notNull(),
    createdById: (0, pg_core_1.varchar)('created_by', { length: 255 }).notNull(),
    sourceChannelId: (0, pg_core_1.varchar)('source_channel_id', { length: 255 }),
    sourceMessageId: (0, pg_core_1.varchar)('source_message_id', { length: 255 }),
    sourceSenderId: (0, pg_core_1.varchar)('source_sender_id', { length: 255 }),
    sourceChannelName: (0, pg_core_1.varchar)('source_channel_name', { length: 255 }),
    sourceMessageText: (0, pg_core_1.text)('source_message_text'),
    reviewedById: (0, pg_core_1.varchar)('reviewed_by', { length: 255 }),
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at', { withTimezone: true }),
    reviewNote: (0, pg_core_1.text)('review_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [table.entityType, table.status, table.createdById]);
//# sourceMappingURL=entity-creation-requests.schema.js.map