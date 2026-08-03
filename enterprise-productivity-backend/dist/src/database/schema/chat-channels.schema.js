"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatChannelAvatars = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.chatChannelAvatars = (0, pg_core_1.pgTable)('chat_channel_avatars', {
    channelId: (0, pg_core_1.varchar)('channel_id', { length: 255 }).primaryKey(),
    avatarUrl: (0, pg_core_1.varchar)('avatar_url', { length: 2048 }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
//# sourceMappingURL=chat-channels.schema.js.map