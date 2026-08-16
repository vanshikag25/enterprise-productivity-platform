"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.BCRYPT_ROUNDS = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const users_service_1 = require("../users/users.service");
exports.BCRYPT_ROUNDS = 10;
const DUMMY_HASH = bcrypt.hashSync('dummy-time-equalizer', exports.BCRYPT_ROUNDS);
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    serializeUser(user) {
        return {
            id: user.username,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
            email: user.email,
            imageUrl: user.imageUrl,
            role: user.role,
            preferredLanguage: user.preferredLanguage,
            createdAt: user.createdAt.toISOString(),
        };
    }
    signToken(user) {
        const payload = {
            sub: user.username,
            username: user.username,
            name: this.serializeUser(user).fullName,
            sessionId: `sess_${user.username}_${Date.now()}`,
        };
        return this.jwtService.sign(payload);
    }
    issueSession(user) {
        return { token: this.signToken(user), user: this.serializeUser(user) };
    }
    async login(identity, password) {
        const username = identity.trim();
        const user = await this.usersService.findByUsername(username);
        if (!user) {
            await bcrypt.compare(password, DUMMY_HASH);
            throw new common_1.UnauthorizedException('Invalid username or password');
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException('This account has no password set yet. Please ask an administrator to set one.');
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid username or password');
        return { token: this.signToken(user), user: this.serializeUser(user) };
    }
    async register(dto) {
        const username = dto.username.trim();
        const email = dto.email.trim().toLowerCase();
        const passwordHash = await bcrypt.hash(dto.password, exports.BCRYPT_ROUNDS);
        const user = await this.usersService.createUser({
            username,
            email,
            passwordHash,
            firstName: dto.firstName ?? null,
            lastName: dto.lastName ?? null,
        });
        this.logger.log(`New account registered: ${username}`);
        return { token: this.signToken(user), user: this.serializeUser(user) };
    }
    async changePassword(username, currentPassword, newPassword) {
        const user = await this.usersService.findByUsername(username);
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('This account has no password set yet.');
        }
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        const passwordHash = await bcrypt.hash(newPassword, exports.BCRYPT_ROUNDS);
        await this.usersService.updatePassword(username, passwordHash);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map