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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const stream_service_1 = require("../stream/stream.service");
const users_service_1 = require("../users/users.service");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard {
    constructor(jwtService, usersService, streamService) {
        this.jwtService = jwtService;
        this.usersService = usersService;
        this.streamService = streamService;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
    }
    async canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        const header = request.headers.authorization ?? '';
        const [scheme, token] = header.split(' ');
        if (scheme !== 'Bearer' || !token) {
            throw new common_1.UnauthorizedException('Missing or invalid bearer token');
        }
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired session');
        }
        if (!payload.sub) {
            throw new common_1.UnauthorizedException('Session has no resolvable user');
        }
        const user = await this.usersService.findByUsername(payload.sub);
        if (!user) {
            throw new common_1.UnauthorizedException('Account no longer exists');
        }
        request.user = user;
        request.auth = { userId: user.username, sessionId: payload.sessionId };
        try {
            await this.streamService.syncUser(user);
        }
        catch (err) {
            this.logger.warn(`Stream user sync failed: ${String(err)}`);
        }
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        users_service_1.UsersService,
        stream_service_1.StreamService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map