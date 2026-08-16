"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationSummaries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.conversationSummaries = (0, pg_core_1.pgTable)('conversation_summaries', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }).notNull(),
    periodType: (0, pg_core_1.varchar)('period_type', { length: 255 }).notNull(),
    periodStart: (0, pg_core_1.timestamp)('period_start', { withTimezone: true }).notNull(),
    periodEnd: (0, pg_core_1.timestamp)('period_end', { withTimezone: true }).notNull(),
    overview: (0, pg_core_1.text)('overview').notNull(),
    keyDecisions: (0, pg_core_1.jsonb)('key_decisions').$type().notNull(),
    actionItems: (0, pg_core_1.jsonb)('action_items').$type().notNull(),
    unresolvedTopics: (0, pg_core_1.jsonb)('unresolved_topics').$type().notNull(),
    messageCount: (0, pg_core_1.integer)('message_count').notNull().default(0),
    provider: (0, pg_core_1.varchar)('provider', { length: 255 }).notNull(),
    generatedAt: (0, pg_core_1.timestamp)('generated_at', { withTimezone: true }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('conversation_summaries_period_unique').on(table.channelId, table.periodType, table.periodStart),
]);
//# sourceMappingURL=conversation-summaries.schema.js.map