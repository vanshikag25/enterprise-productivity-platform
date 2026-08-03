"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    clerk: {
        secretKey: process.env.CLERK_SECRET_KEY,
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    },
    database: {
        url: process.env.DATABASE_URL,
    },
    stream: {
        apiKey: process.env.STREAM_API_KEY,
        secret: process.env.STREAM_SECRET,
    },
});
//# sourceMappingURL=configuration.js.map