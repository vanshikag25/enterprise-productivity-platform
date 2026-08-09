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
});
