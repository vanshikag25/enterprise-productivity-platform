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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
let ClerkService = class ClerkService {
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const secretKey = this.configService.get('clerk.secretKey');
        const publishableKey = this.configService.get('clerk.publishableKey');
        this.client = (0, backend_1.createClerkClient)({
            secretKey,
            publishableKey,
        });
    }
    getClient() {
        return this.client;
    }
};
exports.ClerkService = ClerkService;
exports.ClerkService = ClerkService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClerkService);
//# sourceMappingURL=clerk.service.js.map