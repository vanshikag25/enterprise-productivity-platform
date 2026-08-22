"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.departments = (0, pg_core_1.pgTable)('departments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    managerId: (0, pg_core_1.varchar)('manager_id', { length: 255 }),
    memberIds: (0, pg_core_1.jsonb)('member_ids').$type().notNull().default([]),
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }),
    createdBy: (0, pg_core_1.varchar)('created_by', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=departments.schema.js.map