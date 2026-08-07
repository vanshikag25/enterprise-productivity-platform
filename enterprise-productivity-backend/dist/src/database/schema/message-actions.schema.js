"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminders = exports.messageBookmarks = exports.userNotes = exports.reminderPriorityEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.reminderPriorityEnum = (0, pg_core_1.pgEnum)('reminder_priority', [
    'Low',
    'Medium',
    'High',
]);
exports.userNotes = (0, pg_core_1.pgTable)('user_notes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    sourceChannelId: (0, pg_core_1.varchar)('source_channel_id', { length: 255 }),
    sourceMessageId: (0, pg_core_1.varchar)('source_message_id', { length: 255 }),
    sourceSenderId: (0, pg_core_1.varchar)('source_sender_id', { length: 255 }),
    sourceChannelName: (0, pg_core_1.varchar)('source_channel_name', { length: 255 }),
    sourceMessageText: (0, pg_core_1.text)('source_message_text'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
exports.messageBookmarks = (0, pg_core_1.pgTable)('message_bookmarks', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull(),
    sourceChannelId: (0, pg_core_1.varchar)('source_channel_id', { length: 255 }).notNull(),
    sourceMessageId: (0, pg_core_1.varchar)('source_message_id', { length: 255 }).notNull(),
    sourceSenderId: (0, pg_core_1.varchar)('source_sender_id', { length: 255 }),
    sourceChannelName: (0, pg_core_1.varchar)('source_channel_name', { length: 255 }),
    sourceMessageText: (0, pg_core_1.text)('source_message_text'),
    sourceSenderName: (0, pg_core_1.varchar)('source_sender_name', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('message_bookmarks_user_message_idx').on(table.userId, table.sourceMessageId),
]);
exports.reminders = (0, pg_core_1.pgTable)('reminders', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    scheduledFor: (0, pg_core_1.timestamp)('scheduled_for', { withTimezone: true }).notNull(),
    priority: (0, exports.reminderPriorityEnum)('priority').notNull().default('Medium'),
    notes: (0, pg_core_1.text)('notes'),
    sourceChannelId: (0, pg_core_1.varchar)('source_channel_id', { length: 255 }),
    sourceMessageId: (0, pg_core_1.varchar)('source_message_id', { length: 255 }),
    sourceSenderId: (0, pg_core_1.varchar)('source_sender_id', { length: 255 }),
    sourceChannelName: (0, pg_core_1.varchar)('source_channel_name', { length: 255 }),
    isTriggered: (0, pg_core_1.boolean)('is_triggered').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=message-actions.schema.js.map