import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGIN: Joi.string().default('*'),

  JWT_SECRET: Joi.string().required().messages({
    'any.required': 'JWT_SECRET is required (use a long random string)',
  }),
  JWT_EXPIRES_IN: Joi.string().optional().default('7d'),

  DATABASE_URL: Joi.string().uri().required(),

  STREAM_API_KEY: Joi.string().required(),
  STREAM_SECRET: Joi.string().required(),
});
