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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SmartReplyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartReplyService = void 0;
const common_1 = require("@nestjs/common");
const stream_service_1 = require("../stream/stream.service");
const smart_reply_provider_1 = require("./smart-reply.provider");
const MESSAGES_LIMIT = 40;
let SmartReplyService = SmartReplyService_1 = class SmartReplyService {
    constructor(streamService, provider) {
        this.streamService = streamService;
        this.provider = provider;
        this.logger = new common_1.Logger(SmartReplyService_1.name);
    }
    async getReplies(channelId, userId) {
        const meta = await this.resolveChannel(channelId, userId);
        const messages = await this.fetchRecentMessages(channelId);
        return this.provider.generate({
            channelId,
            channelName: meta.name,
            memberCount: meta.memberCount,
            messages,
            requesterId: userId,
        });
    }
    async describeChannel(channelId) {
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId);
        try {
            const response = await channel.query({
                members: { limit: 100 },
                messages: { limit: 1 },
            });
            const members = response.members
                .map((member) => member.user_id)
                .filter((id) => Boolean(id));
            return {
                name: response.channel?.name ??
                    null,
                memberCount: members.length,
                members,
            };
        }
        catch (err) {
            this.logger.warn(`Failed to describe channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Conversation ${channelId} not found`);
        }
    }
    async resolveChannel(channelId, userId) {
        const meta = await this.describeChannel(channelId);
        if (!meta.members.includes(userId)) {
            throw new common_1.ForbiddenException('You are not a member of this conversation');
        }
        return meta;
    }
    async fetchRecentMessages(channelId) {
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId);
        try {
            const { messages } = await channel.query({
                messages: { limit: MESSAGES_LIMIT },
            });
            return messages
                .filter((m) => !m.type || m.type === 'regular')
                .map((m) => ({
                user: m.user?.name ?? m.user?.id ?? 'Unknown',
                userId: m.user?.id ?? null,
                text: m.text ?? '',
                createdAt: m.created_at ?? null,
            }));
        }
        catch (err) {
            this.logger.warn(`Failed to fetch recent messages for channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Conversation ${channelId} not found`);
        }
    }
};
exports.SmartReplyService = SmartReplyService;
exports.SmartReplyService = SmartReplyService = SmartReplyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(smart_reply_provider_1.SMART_REPLY_PROVIDER)),
    __metadata("design:paramtypes", [stream_service_1.StreamService, Object])
], SmartReplyService);
//# sourceMappingURL=smart-reply.service.js.map