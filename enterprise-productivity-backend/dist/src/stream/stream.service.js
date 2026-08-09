"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StreamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const stream_chat_1 = require("stream-chat");
let StreamService = StreamService_1 = class StreamService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StreamService_1.name);
    }
    async onModuleInit() {
        const apiKey = this.configService.get('stream.apiKey');
        const apiSecret = this.configService.get('stream.secret');
        if (!apiKey || !apiSecret) {
            throw new Error('STREAM_API_KEY or STREAM_SECRET is missing. Check your .env file.');
        }
        this.apiKey = apiKey;
        this.client = stream_chat_1.StreamChat.getInstance(apiKey, apiSecret);
        this.logger.log('Stream Chat server client initialized.');
        await this.ensureAdminCanUseFrozenChannels();
        await this.ensureEveryoneMentionEnabled();
        await this.ensurePollsEnabled();
    }
    async ensurePollsEnabled() {
        try {
            const channelType = await this.client.getChannelType('messaging');
            if (!channelType.polls) {
                await this.client.updateChannelType('messaging', { polls: true });
                this.logger.log('Enabled polls for messaging channels.');
            }
        }
        catch (err) {
            this.logger.warn(`Failed to enable polls for messaging channels: ${err}`);
        }
    }
    async ensureEveryoneMentionEnabled() {
        try {
            const { grants } = await this.client.getChannelType('messaging');
            const updatedGrants = {};
            for (const [role, capabilities] of Object.entries(grants ?? {})) {
                if (!capabilities.includes('send-message'))
                    continue;
                const needsChannel = !capabilities.includes('notify-channel');
                const needsHere = !capabilities.includes('notify-here');
                const needsUpload = !capabilities.includes('upload-file');
                if (needsChannel || needsHere || needsUpload) {
                    updatedGrants[role] = [
                        ...capabilities,
                        ...(needsChannel ? ['notify-channel'] : []),
                        ...(needsHere ? ['notify-here'] : []),
                        ...(needsUpload ? ['upload-file'] : []),
                    ];
                }
            }
            if (Object.keys(updatedGrants).length > 0) {
                await this.client.updateChannelType('messaging', {
                    grants: { ...grants, ...updatedGrants },
                });
                this.logger.log('Enabled @channel / @here mentions and file uploads for messaging channels.');
            }
        }
        catch (err) {
            this.logger.warn(`Failed to enable chat capabilities for messaging channels: ${err}`);
        }
    }
    async ensureAdminCanUseFrozenChannels() {
        try {
            const { grants } = await this.client.getChannelType('messaging');
            const adminGrants = grants?.admin ?? [];
            if (!adminGrants.includes('use-frozen-channel')) {
                await this.client.updateChannelType('messaging', {
                    grants: { ...grants, admin: [...adminGrants, 'use-frozen-channel'] },
                });
                this.logger.log('Granted admin role use-frozen-channel permission.');
            }
        }
        catch (err) {
            this.logger.warn(`Failed to configure frozen-channel permission: ${err}`);
        }
    }
    getClient() {
        return this.client;
    }
    getApiKey() {
        return this.apiKey;
    }
    async syncUser(user) {
        const name = [user.firstName, user.lastName]
            .filter((part) => Boolean(part))
            .join(' ');
        await this.client.upsertUser({
            id: user.username,
            name: name || undefined,
            image: user.imageUrl ?? undefined,
            role: user.role === 'admin' ? 'admin' : 'user',
        });
        this.logger.log(`Stream user synced: ${user.username}`);
    }
    createUserToken(username) {
        return this.client.createToken(username);
    }
    async getOrCreateDirectChannel(userId, targetUserId) {
        const channel = this.client.channel('messaging', {
            members: [userId, targetUserId],
            created_by_id: userId,
        });
        await channel.create();
        if (!channel.id) {
            throw new Error('Stream did not return a channel id after channel.create().');
        }
        this.logger.log(`Direct channel ready: ${channel.id} (${userId} <-> ${targetUserId})`);
        return channel.id;
    }
    async createGroupChannel(userId, groupName, description, memberIds) {
        const uniqueMembers = Array.from(new Set([userId, ...memberIds]));
        const channelId = (0, crypto_1.randomUUID)();
        const groupData = {
            name: groupName,
            ...(description !== undefined ? { description } : {}),
            members: uniqueMembers,
            created_by_id: userId,
        };
        const channel = this.client.channel('messaging', channelId, groupData);
        await channel.create();
        if (!channel.id) {
            throw new Error('Stream did not return a channel id after group channel.create().');
        }
        this.logger.log(`Group channel created: ${channel.id} ("${groupName}", ${uniqueMembers.length} members)`);
        return channel;
    }
    async getUsersPresence(usernames) {
        const presenceMap = new Map();
        if (usernames.length === 0) {
            return presenceMap;
        }
        const response = await this.client.queryUsers({ id: { $in: usernames } });
        for (const streamUser of response.users) {
            presenceMap.set(streamUser.id, {
                online: Boolean(streamUser.online),
                lastActive: streamUser.last_active ?? null,
            });
        }
        return presenceMap;
    }
};
exports.StreamService = StreamService;
exports.StreamService = StreamService = StreamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StreamService);
//# sourceMappingURL=stream.service.js.map