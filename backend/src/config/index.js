import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',

  // Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 1024,
    apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1',
  },

  // Haravan
  haravan: {
    shopId: process.env.HARAVAN_SHOP_ID,
    apiKey: process.env.HARAVAN_API_KEY,
    baseUrl: 'https://chapi.myharavan.com/2024-07',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/lifxy_chatbot',
    pool: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    // Enable SSL when running against managed DBs (set DATABASE_SSL=true)
    ssl: process.env.DATABASE_SSL === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : null,
  },

  // Redis (optional)
  redis: {
    url: process.env.REDIS_URL || null,
  },

  // CORS
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  },

  // Cache
  cache: {
    productsCacheTTL: 3600, // 1 hour
    chatHistoryTTL: 86400, // 24 hours
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
