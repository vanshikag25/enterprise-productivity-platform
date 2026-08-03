export declare const chatChannelAvatars: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "chat_channel_avatars";
    schema: undefined;
    columns: {
        channelId: import("drizzle-orm/pg-core").PgColumn<{
            name: "channel_id";
            tableName: "chat_channel_avatars";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 255;
        }>;
        avatarUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "avatar_url";
            tableName: "chat_channel_avatars";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 2048;
        }>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "chat_channel_avatars";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type ChatChannelAvatar = typeof chatChannelAvatars.$inferSelect;
export type NewChatChannelAvatar = typeof chatChannelAvatars.$inferInsert;
