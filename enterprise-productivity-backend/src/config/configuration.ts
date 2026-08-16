export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  auth: {
    jwtSecret:
      process.env.JWT_SECRET ?? 'dev-only-secret-change-me-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  stream: {
    apiKey: process.env.STREAM_API_KEY,
    secret: process.env.STREAM_SECRET,
  },

  ai: {
    provider: process.env.AI_PROVIDER ?? 'mock',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  },

  sentiment: {
    // Bootstrap default for the sentiment feature. Once a value is persisted
    // in app_settings ('sentiment.enabled'), the stored value takes precedence.
    enabled: (process.env.SENTIMENT_ANALYSIS_ENABLED ?? 'false') === 'true',
  },

  summaries: {
    backfillIntervalMs: parseInt(
      process.env.SUMMARIES_BACKFILL_INTERVAL_MS ?? '3600000',
      10,
    ),
  },

  actionDetection: {
    backfillIntervalMs: parseInt(
      process.env.ACTION_DETECTION_BACKFILL_INTERVAL_MS ?? '900000',
      10,
    ),
  },
});
