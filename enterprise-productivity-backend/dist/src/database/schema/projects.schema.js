"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectMembers = exports.projects = exports.projectMemberRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.projectMemberRoleEnum = (0, pg_core_1.pgEnum)('project_member_role', [
    'owner',
    'manager',
    'member',
    'guest',
]);
exports.projects = (0, pg_core_1.pgTable)('projects', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    avatarUrl: (0, pg_core_1.varchar)('avatar_url', { length: 2048 }),
    ownerId: (0, pg_core_1.varchar)('owner_id', { length: 255 }).notNull(),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
exports.projectMembers = (0, pg_core_1.pgTable)('project_members', {
    projectId: (0, pg_core_1.uuid)('project_id')
        .notNull()
        .references(() => exports.projects.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull(),
    role: (0, exports.projectMemberRoleEnum)('role').notNull().default('member'),
    joinedAt: (0, pg_core_1.timestamp)('joined_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('project_members_project_user_idx').on(table.projectId, table.userId),
]);
//# sourceMappingURL=projects.schema.js.map