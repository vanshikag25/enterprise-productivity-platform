"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectMilestones = exports.milestoneStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const projects_schema_1 = require("./projects.schema");
exports.milestoneStatusEnum = (0, pg_core_1.pgEnum)('milestone_status', [
    'planned',
    'in_progress',
    'completed',
    'delayed',
]);
exports.projectMilestones = (0, pg_core_1.pgTable)('project_milestones', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    projectId: (0, pg_core_1.uuid)('project_id')
        .notNull()
        .references(() => projects_schema_1.projects.id, { onDelete: 'cascade' }),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    dueDate: (0, pg_core_1.timestamp)('due_date', { withTimezone: true }),
    ownerId: (0, pg_core_1.varchar)('owner_id', { length: 255 }),
    status: (0, exports.milestoneStatusEnum)('status').notNull().default('planned'),
    progress: (0, pg_core_1.integer)('progress').notNull().default(0),
    streamChannelId: (0, pg_core_1.varchar)('stream_channel_id', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=project-milestones.schema.js.map