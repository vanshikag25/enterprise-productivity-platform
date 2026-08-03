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
exports.StreamController = void 0;
const common_1 = require("@nestjs/common");
const clerk_auth_guard_1 = require("../clerk/clerk-auth.guard");
const current_user_decorator_1 = require("../clerk/current-user.decorator");
const stream_service_1 = require("./stream.service");
let StreamController = class StreamController {
    constructor(streamService) {
        this.streamService = streamService;
    }
    getToken(auth) {
        if (!auth.userId) {
            throw new common_1.UnauthorizedException('Session has no resolvable userId');
        }
        const token = this.streamService.createUserToken(auth.userId);
        return { token };
    }
};
exports.StreamController = StreamController;
__decorate([
    (0, common_1.Get)('token'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], StreamController.prototype, "getToken", null);
exports.StreamController = StreamController = __decorate([
    (0, common_1.Controller)('stream'),
    __metadata("design:paramtypes", [stream_service_1.StreamService])
], StreamController);
//# sourceMappingURL=stream.controller.js.map