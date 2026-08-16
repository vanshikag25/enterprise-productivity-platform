"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appSettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.appSettings = (0, pg_core_1.pgTable)('app_settings', {
    key: (0, pg_core_1.text)('key').primaryKey(),
    value: (0, pg_core_1.jsonb)('value').$type().notNull(),
    updatedBy: (0, pg_core_1.text)('updated_by'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=app-settings.schema.js.map