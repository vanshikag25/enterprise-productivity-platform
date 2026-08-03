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
var ClerkAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const clerk_service_1 = require("./clerk.service");
const users_service_1 = require("../users/users.service");
const stream_service_1 = require("../stream/stream.service");
let ClerkAuthGuard = ClerkAuthGuard_1 = class ClerkAuthGuard {
    constructor(clerkService, usersService, streamService) {
        this.clerkService = clerkService;
        this.usersService = usersService;
        this.streamService = streamService;
        this.logger = new common_1.Logger(ClerkAuthGuard_1.name);
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const fetchRequest = this.toFetchRequest(request);
        const requestState = await this.clerkService
            .getClient()
            .authenticateRequest(fetchRequest);
        if (!requestState.isSignedIn) {
            this.logger.debug(JSON.stringify(requestState, null, 2));
            throw new common_1.UnauthorizedException('Invalid or missing session');
        }
        const auth = requestState.toAuth();
        request.auth = auth;
        if (!auth.userId) {
            throw new common_1.UnauthorizedException('Session has no resolvable userId');
        }
        const clerkUser = await this.clerkService
            .getClient()
            .users.getUser(auth.userId);
        const primaryEmail = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
        if (!primaryEmail) {
            this.logger.error(`Clerk user ${auth.userId} has no resolvable primary email.`);
            throw new common_1.UnauthorizedException('User has no verified email');
        }
        const savedUser = await this.usersService.upsertUser({
            clerkId: clerkUser.id,
            email: primaryEmail,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
        });
        request.user = savedUser;
        await this.streamService.syncUser(savedUser);
        return true;
    }
    toFetchRequest(req) {
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}${req.originalUrl}`;
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') {
                headers.append(key, value);
            }
            else if (Array.isArray(value)) {
                value.forEach((v) => headers.append(key, v));
            }
        }
        return new globalThis.Request(url, {
            method: req.method,
            headers,
        });
    }
};
exports.ClerkAuthGuard = ClerkAuthGuard;
exports.ClerkAuthGuard = ClerkAuthGuard = ClerkAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [clerk_service_1.ClerkService,
        users_service_1.UsersService,
        stream_service_1.StreamService])
], ClerkAuthGuard);
//# sourceMappingURL=clerk-auth.guard.js.map