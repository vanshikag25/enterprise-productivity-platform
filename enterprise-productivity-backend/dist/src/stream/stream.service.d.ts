import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat, Channel as StreamChannelType } from 'stream-chat';
import { User } from '../database/schema/users.schema';
export interface UserPresence {
    online: boolean;
    lastActive: string | null;
    status: string | null;
}
export declare class StreamService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private client;
    private apiKey;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    private ensurePollsEnabled;
    private ensureEveryoneMentionEnabled;
    private ensureFrozenChannelPermissions;
    getClient(): StreamChat;
    getApiKey(): string;
    syncUser(user: User): Promise<void>;
    setUserStatus(username: string, status: string | null): Promise<void>;
    createUserToken(username: string): string;
    getOrCreateDirectChannel(userId: string, targetUserId: string): Promise<string>;
    createGroupChannel(userId: string, groupName: string, description: string | undefined, memberIds: string[]): Promise<StreamChannelType>;
    getUsersPresence(usernames: string[]): Promise<Map<string, UserPresence>>;
}
