"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectAnnouncementReactions = exports.projectAnnouncements = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const projects_schema_1 = require("./projects.schema");
exports.projectAnnouncements = (0, pg_core_1.pgTable)('project_announcements', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    projectId: (0, pg_core_1.uuid)('project_id')
        .notNull()
        .references(() => projects_schema_1.projects.id, { onDelete: 'cascade' }),
    authorId: (0, pg_core_1.varchar)('author_id', { length: 255 }).notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    body: (0, pg_core_1.text)('body').notNull(),
    isPinned: (0, pg_core_1.boolean)('is_pinned').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
exports.projectAnnouncementReactions = (0, pg_core_1.pgTable)('project_announcement_reactions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    announcementId: (0, pg_core_1.uuid)('announcement_id')
        .notNull()
        .references(() => exports.projectAnnouncements.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull(),
    emoji: (0, pg_core_1.varchar)('emoji', { length: 32 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('project_announcement_reactions_unique_idx').on(table.announcementId, table.userId, table.emoji),
]);
//# sourceMappingURL=project-announcements.schema.js.map