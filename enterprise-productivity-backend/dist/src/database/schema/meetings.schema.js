"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetings = exports.meetingStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.meetingStatusEnum = (0, pg_core_1.pgEnum)('meeting_status', [
    'Scheduled',
    'Ongoing',
    'Completed',
    'Cancelled',
]);
exports.meetings = (0, pg_core_1.pgTable)('meetings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    scheduledDate: (0, pg_core_1.timestamp)('scheduled_date', { withTimezone: true }).notNull(),
    startTime: (0, pg_core_1.varchar)('start_time', { length: 5 }).notNull(),
    endTime: (0, pg_core_1.varchar)('end_time', { length: 5 }).notNull(),
    organizerId: (0, pg_core_1.varchar)('organizer_id', { length: 255 }).notNull(),
    participants: (0, pg_core_1.jsonb)('participants').$type().notNull().default([]),
    meetingStatus: (0, exports.meetingStatusEnum)('meeting_status')
        .notNull()
        .default('Scheduled'),
    meetingChatChannelId: (0, pg_core_1.varchar)('meeting_chat_channel_id', { length: 255 }),
    sourceChannelId: (0, pg_core_1.varchar)('source_channel_id', { length: 255 }),
    sourceMessageId: (0, pg_core_1.varchar)('source_message_id', { length: 255 }),
    sourceSenderId: (0, pg_core_1.varchar)('source_sender_id', { length: 255 }),
    sourceChannelName: (0, pg_core_1.varchar)('source_channel_name', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=meetings.schema.js.map