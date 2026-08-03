"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkClientProvider = exports.CLERK_CLIENT = void 0;
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
exports.CLERK_CLIENT = 'CLERK_CLIENT';
exports.ClerkClientProvider = {
    provide: exports.CLERK_CLIENT,
    inject: [config_1.ConfigService],
    useFactory: (configService) => {
        return (0, backend_1.createClerkClient)({
            secretKey: configService.get('clerk.secretKey'),
            publishableKey: configService.get('clerk.publishableKey'),
        });
    },
};
//# sourceMappingURL=clerk-client.provider.js.map