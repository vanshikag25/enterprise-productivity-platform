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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const clerk_auth_guard_1 = require("../clerk/clerk-auth.guard");
const current_user_decorator_1 = require("../clerk/current-user.decorator");
const stream_service_1 = require("../stream/stream.service");
const chat_service_1 = require("./chat.service");
let ChatController = class ChatController {
    constructor(streamService, chatService) {
        this.streamService = streamService;
        this.chatService = chatService;
    }
    uid(auth) {
        if (!auth.userId) {
            throw new common_1.UnauthorizedException('Session has no resolvable userId');
        }
        return auth.userId;
    }
    getToken(auth) {
        const userId = this.uid(auth);
        const streamToken = this.streamService.createUserToken(userId);
        const apiKey = this.streamService.getApiKey();
        return { streamToken, apiKey };
    }
    async createDirectChannel(auth, body) {
        if (!auth.userId) {
            throw new common_1.UnauthorizedException('Session has no resolvable userId');
        }
        if (!body.targetUserId || typeof body.targetUserId !== 'string') {
            throw new common_1.BadRequestException('targetUserId is required.');
        }
        if (body.targetUserId === auth.userId) {
            throw new common_1.BadRequestException('Cannot create a direct channel with yourself.');
        }
        const channelId = await this.streamService.getOrCreateDirectChannel(auth.userId, body.targetUserId);
        return { channelId };
    }
    async createGroupChannel(auth, body) {
        if (!auth.userId) {
            throw new common_1.UnauthorizedException('Session has no resolvable userId');
        }
        if (!body.groupName || typeof body.groupName !== 'string') {
            throw new common_1.BadRequestException('groupName is required.');
        }
        if (body.description !== undefined &&
            typeof body.description !== 'string') {
            throw new common_1.BadRequestException('description must be a string.');
        }
        if (!Array.isArray(body.memberIds) ||
            body.memberIds.some((id) => typeof id !== 'string')) {
            throw new common_1.BadRequestException('memberIds must be an array of strings.');
        }
        if (body.memberIds.length === 0) {
            throw new common_1.BadRequestException('At least one other member is required to create a group.');
        }
        const channel = await this.streamService.createGroupChannel(auth.userId, body.groupName, body.description, body.memberIds);
        const channelData = channel.data;
        return {
            channelId: channel.id ?? '',
            name: channelData?.name,
            description: channelData?.description,
            memberIds: Object.keys(channel.state?.members ?? {}),
        };
    }
    getGroupInfo(auth, channelId) {
        return this.chatService.getGroupInfo(channelId, this.uid(auth));
    }
    updateGroup(auth, channelId, body) {
        return this.chatService.updateGroup(channelId, this.uid(auth), body);
    }
    updateGroupAvatar(auth, channelId, body) {
        if (!body.avatarUrl || typeof body.avatarUrl !== 'string') {
            throw new common_1.BadRequestException('avatarUrl is required.');
        }
        return this.chatService.updateGroupAvatar(channelId, this.uid(auth), body.avatarUrl);
    }
    removeGroupAvatar(auth, channelId) {
        return this.chatService.removeGroupAvatar(channelId, this.uid(auth));
    }
    addMember(auth, channelId, memberId) {
        return this.chatService.addMember(channelId, this.uid(auth), memberId);
    }
    removeMember(auth, channelId, memberId) {
        return this.chatService.removeMember(channelId, this.uid(auth), memberId);
    }
    leaveGroup(auth, channelId) {
        return this.chatService.leaveGroup(channelId, this.uid(auth));
    }
    assignModerator(auth, channelId, memberId) {
        return this.chatService.assignModerator(channelId, this.uid(auth), memberId);
    }
    demoteModerator(auth, channelId, memberId) {
        return this.chatService.demoteModerator(channelId, this.uid(auth), memberId);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('token'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], ChatController.prototype, "getToken", null);
__decorate([
    (0, common_1.Post)('direct'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createDirectChannel", null);
__decorate([
    (0, common_1.Post)('group'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createGroupChannel", null);
__decorate([
    (0, common_1.Get)('groups/:channelId'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getGroupInfo", null);
__decorate([
    (0, common_1.Patch)('groups/:channelId'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateGroup", null);
__decorate([
    (0, common_1.Put)('groups/:channelId/avatar'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateGroupAvatar", null);
__decorate([
    (0, common_1.Delete)('groups/:channelId/avatar'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "removeGroupAvatar", null);
__decorate([
    (0, common_1.Post)('groups/:channelId/members/:memberId'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __param(2, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "addMember", null);
__decorate([
    (0, common_1.Delete)('groups/:channelId/members/:memberId'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __param(2, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Post)('groups/:channelId/leave'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "leaveGroup", null);
__decorate([
    (0, common_1.Post)('groups/:channelId/moderators/:memberId'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __param(2, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "assignModerator", null);
__decorate([
    (0, common_1.Delete)('groups/:channelId/moderators/:memberId'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('channelId')),
    __param(2, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "demoteModerator", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [stream_service_1.StreamService,
        chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map