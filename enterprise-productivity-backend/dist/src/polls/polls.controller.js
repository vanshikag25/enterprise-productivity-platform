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
exports.PollsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const polls_service_1 = require("./polls.service");
const create_poll_dto_1 = require("./dto/create-poll.dto");
const update_poll_dto_1 = require("./dto/update-poll.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let PollsController = class PollsController {
    constructor(pollsService) {
        this.pollsService = pollsService;
    }
    create(auth, dto) {
        return this.pollsService.create(requireUserId(auth), dto);
    }
    findForChannel(channelId) {
        return this.pollsService.findForChannel(channelId);
    }
    resolve(streamPollId) {
        return this.pollsService.resolve(streamPollId);
    }
    update(auth, streamPollId, dto) {
        return this.pollsService.update(streamPollId, requireUserId(auth), dto);
    }
    close(auth, streamPollId) {
        return this.pollsService.close(streamPollId, requireUserId(auth));
    }
    finalize(streamPollId) {
        return this.pollsService.finalize(streamPollId);
    }
    remove(auth, streamPollId) {
        return this.pollsService.remove(streamPollId, requireUserId(auth));
    }
};
exports.PollsController = PollsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_poll_dto_1.CreatePollDto]),
    __metadata("design:returntype", void 0)
], PollsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('channel/:channelId'),
    __param(0, (0, common_1.Param)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PollsController.prototype, "findForChannel", null);
__decorate([
    (0, common_1.Get)('stream/:streamPollId'),
    __param(0, (0, common_1.Param)('streamPollId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PollsController.prototype, "resolve", null);
__decorate([
    (0, common_1.Patch)('stream/:streamPollId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('streamPollId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_poll_dto_1.UpdatePollDto]),
    __metadata("design:returntype", void 0)
], PollsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('stream/:streamPollId/close'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('streamPollId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PollsController.prototype, "close", null);
__decorate([
    (0, common_1.Post)('stream/:streamPollId/finalize'),
    __param(0, (0, common_1.Param)('streamPollId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PollsController.prototype, "finalize", null);
__decorate([
    (0, common_1.Delete)('stream/:streamPollId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('streamPollId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PollsController.prototype, "remove", null);
exports.PollsController = PollsController = __decorate([
    (0, common_1.Controller)('polls'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [polls_service_1.PollsService])
], PollsController);
//# sourceMappingURL=polls.controller.js.map