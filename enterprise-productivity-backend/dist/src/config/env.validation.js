"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = void 0;
const Joi = require("joi");
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),
    CORS_ORIGIN: Joi.string().default('*'),
    CLERK_SECRET_KEY: Joi.string().required(),
    CLERK_PUBLISHABLE_KEY: Joi.string().required(),
    DATABASE_URL: Joi.string().uri().required(),
    STREAM_API_KEY: Joi.string().required(),
    STREAM_SECRET: Joi.string().required(),
});
//# sourceMappingURL=env.validation.js.map