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

// Initialize database tables
export const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        haravan_id BIGINT UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        compare_at_price DECIMAL(10, 2),
        image_url TEXT,
        handle VARCHAR(255),
        vendor VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
