import pkg from 'pg';
import config from '../config/index.js';

const { Pool } = pkg;

const poolOptions = {
  connectionString: config.database.url,
  ...config.database.pool,
};

if (config.database.ssl) {
  poolOptions.ssl = config.database.ssl;
}

const pool = new Pool(poolOptions);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize database tables with retry logic for cold starts
export const initializeDatabase = async (maxRetries = 5, delayMs = 2000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      
      try {
        // Products table with extended RAG fields
        await client.query(`
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            haravan_id BIGINT UNIQUE NOT NULL,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            price DECIMAL(15, 2) NOT NULL,
            compare_at_price DECIMAL(15, 2),
            image_url TEXT,
            handle VARCHAR(255),
            vendor VARCHAR(255),
            status VARCHAR(50),
            usp TEXT,
            target_audience TEXT,
            faq JSONB,
            specifications JSONB,
            shopee_url TEXT,
            tiktok_url TEXT,
            published_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create full-text search index for better product search
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_products_search 
          ON products USING gin(
            to_tsvector('english', 
              title || ' ' || 
              COALESCE(description, '') || ' ' || 
              COALESCE(usp, '') || ' ' ||
              COALESCE(target_audience, '')
            )
          );
        `);

        // Chat history table
        await client.query(`
          CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL,
            user_message TEXT NOT NULL,
            bot_response TEXT NOT NULL,
            referenced_products JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Chat sessions table
        await client.query(`
          CREATE TABLE IF NOT EXISTS chat_sessions (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) UNIQUE NOT NULL,
            customer_email VARCHAR(255),
            customer_name VARCHAR(255),
            ip_address VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        console.log('✅ Database initialized successfully');
        return; // Success, exit function
        
      } finally {
        client.release();
      }
      
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  Database initialization attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries failed
  console.error('❌ Database initialization failed after all retries');
  throw lastError;
};

export default pool;
