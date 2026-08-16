"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageTranslations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.messageTranslations = (0, pg_core_1.pgTable)('message_translations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    messageId: (0, pg_core_1.varchar)('message_id', { length: 255 }).notNull(),
    targetLanguage: (0, pg_core_1.varchar)('target_language', { length: 64 }).notNull(),
    sourceHash: (0, pg_core_1.varchar)('source_hash', { length: 64 }).notNull(),
    sourceText: (0, pg_core_1.text)('source_text').notNull(),
    detectedSourceLanguage: (0, pg_core_1.varchar)('detected_source_language', {
        length: 64,
    }),
    translatedText: (0, pg_core_1.text)('translated_text').notNull(),
    provider: (0, pg_core_1.varchar)('provider', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('message_translations_message_language_unique').on(table.messageId, table.targetLanguage),
]);
//# sourceMappingURL=message-translations.schema.js.map