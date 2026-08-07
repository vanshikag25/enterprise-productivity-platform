"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasks = exports.taskPriorityEnum = exports.taskStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.taskStatusEnum = (0, pg_core_1.pgEnum)('task_status', [
    'Todo',
    'In Progress',
    'In Review',
    'Completed',
    'Closed',
]);
exports.taskPriorityEnum = (0, pg_core_1.pgEnum)('task_priority', [
    'Low',
    'Medium',
    'High',
    'Critical',
]);
exports.tasks = (0, pg_core_1.pgTable)('tasks', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, exports.taskStatusEnum)('status').notNull().default('Todo'),
    priority: (0, exports.taskPriorityEnum)('priority').notNull().default('Medium'),
    dueDate: (0, pg_core_1.timestamp)('due_date', { withTimezone: true }),
    createdBy: (0, pg_core_1.varchar)('created_by', { length: 255 }).notNull(),
    assignee: (0, pg_core_1.varchar)('assignee', { length: 255 }),
    streamChannelId: (0, pg_core_1.varchar)('stream_channel_id', { length: 255 }),
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
//# sourceMappingURL=tasks.schema.js.map