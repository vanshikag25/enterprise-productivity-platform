"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectDocuments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const projects_schema_1 = require("./projects.schema");
exports.projectDocuments = (0, pg_core_1.pgTable)('project_documents', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    projectId: (0, pg_core_1.uuid)('project_id')
        .notNull()
        .references(() => projects_schema_1.projects.id, { onDelete: 'cascade' }),
    uploaderId: (0, pg_core_1.varchar)('uploader_id', { length: 255 }).notNull(),
    originalName: (0, pg_core_1.varchar)('original_name', { length: 255 }).notNull(),
    storagePath: (0, pg_core_1.varchar)('storage_path', { length: 1024 }).notNull(),
    mimeType: (0, pg_core_1.varchar)('mime_type', { length: 128 }).notNull(),
    sizeBytes: (0, pg_core_1.bigint)('size_bytes', { mode: 'number' }).notNull(),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=project-documents.schema.js.map