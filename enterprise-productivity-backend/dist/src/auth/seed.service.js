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
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = exports.DEMO_ADMIN = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const users_service_1 = require("../users/users.service");
const roles_1 = require("../rbac/roles");
const auth_service_1 = require("./auth.service");
exports.DEMO_ADMIN = {
    username: 'superadmin',
    password: 'SuperAdmin@123',
    email: 'superadmin@enterprise.local',
    firstName: 'Super',
    lastName: 'Admin',
};
let SeedService = SeedService_1 = class SeedService {
    constructor(usersService) {
        this.usersService = usersService;
        this.logger = new common_1.Logger(SeedService_1.name);
    }
    async onApplicationBootstrap() {
        try {
            const existing = await this.usersService.findByUsername(exports.DEMO_ADMIN.username);
            if (existing) {
                if (!existing.passwordHash) {
                    const passwordHash = await bcrypt.hash(exports.DEMO_ADMIN.password, auth_service_1.BCRYPT_ROUNDS);
                    await this.usersService.updatePassword(existing.username, passwordHash);
                    this.logger.log(`Seeded demo password for existing account "${existing.username}"`);
                }
                return;
            }
            const passwordHash = await bcrypt.hash(exports.DEMO_ADMIN.password, auth_service_1.BCRYPT_ROUNDS);
            await this.usersService.createUser({
                username: exports.DEMO_ADMIN.username,
                email: exports.DEMO_ADMIN.email,
                passwordHash,
                firstName: exports.DEMO_ADMIN.firstName,
                lastName: exports.DEMO_ADMIN.lastName,
                role: roles_1.UserRole.SUPER_ADMIN,
            });
            this.logger.log('Seeded demo Super Admin account');
        }
        catch (err) {
            this.logger.error(`Failed to seed demo admin: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], SeedService);
//# sourceMappingURL=seed.service.js.map