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
var VideoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const stream_service_1 = require("../stream/stream.service");
const roles_1 = require("../rbac/roles");
let VideoService = VideoService_1 = class VideoService {
    constructor(configService, streamService) {
        this.configService = configService;
        this.streamService = streamService;
        this.logger = new common_1.Logger(VideoService_1.name);
        this.cachedCredentials = null;
        this.cachedJwt = null;
    }
    async onModuleInit() {
        await this.ensureCallMembersCanJoinBackstage();
    }
    async ensureCallMembersCanJoinBackstage() {
        try {
            const credentials = this.getCredentials();
            const token = this.getJwt(credentials.secret).sign({ server: true });
            const base = `https://video.stream-io-api.com/api/v2/video/calltypes/default?api_key=${credentials.apiKey}`;
            const headers = {
                Authorization: `Bearer ${token}`,
                'stream-auth-type': 'jwt',
                'Content-Type': 'application/json',
            };
            const response = await fetch(base, { headers });
            if (!response.ok) {
                this.logger.warn(`Could not read the "default" call type (${response.status}), check Stream Video credentials`);
                return;
            }
            const body = (await response.json());
            const grants = body.grants;
            const callMemberGrants = grants?.call_member;
            if (!Array.isArray(callMemberGrants)) {
                this.logger.warn('The "default" call type has no call_member grants');
                return;
            }
            if (callMemberGrants.includes('join-backstage')) {
                this.logger.log('call_member role already allows joining the backstage');
                return;
            }
            const update = { ...(grants ?? {}) };
            update.call_member = [...callMemberGrants, 'join-backstage'];
            const updateResponse = await fetch(base, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ grants: update }),
            });
            if (updateResponse.ok) {
                this.logger.log('Granted call_member the join-backstage capability on the "default" call type');
            }
            else {
                this.logger.warn(`Could not update the "default" call type (${updateResponse.status})`);
            }
        }
        catch (err) {
            this.logger.warn(`Backstage capability setup skipped: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async issueVideoToken(userId, role, dto) {
        if (dto.kind === 'group' && !(0, roles_1.hasMinRole)(role ?? '', roles_1.UserRole.TEAM_LEAD)) {
            throw new common_1.ForbiddenException('Starting a group call requires at least the Team Lead role');
        }
        const memberIds = await this.resolveChannelMembers(dto.channelId, userId);
        const credentials = this.getCredentials();
        const token = this.getJwt(credentials.secret).sign({ user_id: userId });
        return {
            apiKey: credentials.apiKey,
            userId,
            token,
            memberIds,
        };
    }
    async connect(userId) {
        const credentials = this.getCredentials();
        const token = this.getJwt(credentials.secret).sign({ user_id: userId });
        return Promise.resolve({
            apiKey: credentials.apiKey,
            userId,
            token,
        });
    }
    async resolveChannelMembers(channelId, userId) {
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
            if (!members.includes(userId)) {
                throw new common_1.ForbiddenException('You are not a member of this conversation');
            }
            return members;
        }
        catch (err) {
            if (err instanceof common_1.ForbiddenException)
                throw err;
            this.logger.warn(`Failed to describe channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Conversation ${channelId} not found`);
        }
    }
    getCredentials() {
        if (this.cachedCredentials)
            return this.cachedCredentials;
        const apiKey = this.configService.get('video.apiKey');
        const secret = this.configService.get('video.secret');
        if (!apiKey || !secret) {
            throw new common_1.ServiceUnavailableException('Video calls are not configured (STREAM_API_KEY / STREAM_SECRET missing)');
        }
        this.cachedCredentials = { apiKey, secret };
        return this.cachedCredentials;
    }
    getJwt(secret) {
        if (this.cachedJwt)
            return this.cachedJwt;
        const options = {
            secret,
            signOptions: {
                algorithm: 'HS256',
                expiresIn: '24h',
            },
        };
        this.cachedJwt = new jwt_1.JwtService(options);
        return this.cachedJwt;
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = VideoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        stream_service_1.StreamService])
], VideoService);
//# sourceMappingURL=video.service.js.map