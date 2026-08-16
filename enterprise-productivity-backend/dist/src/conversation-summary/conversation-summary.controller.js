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
exports.ConversationSummaryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const conversation_summary_service_1 = require("./conversation-summary.service");
const generate_conversation_summary_dto_1 = require("./dto/generate-conversation-summary.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
function requireChannelId(channelId) {
    if (!channelId)
        throw new common_1.BadRequestException('channelId is required as a query parameter');
    return channelId;
}
let ConversationSummaryController = class ConversationSummaryController {
    constructor(conversationSummaryService) {
        this.conversationSummaryService = conversationSummaryService;
    }
    list(auth, channelId) {
        return this.conversationSummaryService.listSummaries(requireChannelId(channelId), requireUserId(auth));
    }
    getDaily(auth, channelId) {
        return this.conversationSummaryService.getCurrent(requireChannelId(channelId), requireUserId(auth), 'daily');
    }
    getWeekly(auth, channelId) {
        return this.conversationSummaryService.getCurrent(requireChannelId(channelId), requireUserId(auth), 'weekly');
    }
    generate(auth, dto) {
        return this.conversationSummaryService.generate(dto.channelId, requireUserId(auth), dto);
    }
};
exports.ConversationSummaryController = ConversationSummaryController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationSummaryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('daily'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationSummaryController.prototype, "getDaily", null);
__decorate([
    (0, common_1.Get)('weekly'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationSummaryController.prototype, "getWeekly", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_conversation_summary_dto_1.GenerateConversationSummaryDto]),
    __metadata("design:returntype", void 0)
], ConversationSummaryController.prototype, "generate", null);
exports.ConversationSummaryController = ConversationSummaryController = __decorate([
    (0, common_1.Controller)('chat/summaries'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [conversation_summary_service_1.ConversationSummaryService])
], ConversationSummaryController);
//# sourceMappingURL=conversation-summary.controller.js.map