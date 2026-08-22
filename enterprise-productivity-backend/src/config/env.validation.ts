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
  STREAM_VIDEO_KEY: Joi.string().optional(),
  STREAM_VIDEO_SECRET: Joi.string().optional(),

  AI_PROVIDER: Joi.string().valid('mock', 'gemini', 'openai').default('mock'),
  GEMINI_API_KEY: Joi.string().optional(),
  GEMINI_MODEL: Joi.string().optional(),
  GEMINI_BASE_URL: Joi.string().uri().optional(),
  OPENAI_API_KEY: Joi.string().optional(),
  OPENAI_MODEL: Joi.string().optional(),
  OPENAI_BASE_URL: Joi.string().uri().optional(),
  SENTIMENT_ANALYSIS_ENABLED: Joi.string()
    .valid('true', 'false')
    .optional()
    .default('false'),
  SUMMARIES_BACKFILL_INTERVAL_MS: Joi.number().optional(),
  ACTION_DETECTION_BACKFILL_INTERVAL_MS: Joi.number().optional(),
});
