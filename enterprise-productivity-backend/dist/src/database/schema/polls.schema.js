"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polls = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.polls = (0, pg_core_1.pgTable)('polls', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    streamPollId: (0, pg_core_1.varchar)('stream_poll_id', { length: 255 }).notNull().unique(),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }).notNull(),
    messageId: (0, pg_core_1.varchar)('message_id', { length: 255 }).notNull(),
    question: (0, pg_core_1.text)('question').notNull(),
    createdBy: (0, pg_core_1.varchar)('created_by', { length: 255 }).notNull(),
    deadline: (0, pg_core_1.timestamp)('deadline', { withTimezone: true }),
    closedAt: (0, pg_core_1.timestamp)('closed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=polls.schema.js.map