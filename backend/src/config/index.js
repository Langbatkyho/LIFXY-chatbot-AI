import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',

  // Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 1024,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta', // Force v1beta endpoint for free tier
  },

  // Haravan
  haravan: {
    accessToken: process.env.HARAVAN_ACCESS_TOKEN,
    shopUrl: process.env.HARAVAN_SHOP_URL, // optional: https://carmate.myharavan.com
    apiVersion: process.env.HARAVAN_API_VERSION || '2024-07',
    // Optional explicit API base override. If not set, service will
    // default to CHAPI (https://chapi.myharavan.com/{version}) or
    // shopUrl + /admin/api/{version} when shopUrl is provided.
    apiBase: process.env.HARAVAN_API_BASE || null,
    // Enable automatic fallback to CHAPI when shop admin API returns 404/401
    fallbackToChapi: process.env.HARAVAN_FALLBACK_TO_CHAPI !== 'false',
    // Explicit API mode per Haravan docs: 'commerce' | 'admin' | 'chapi'
    // If unset, the service will infer: admin when shopUrl is set; otherwise commerce.
    apiMode: process.env.HARAVAN_API_MODE || null,
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
