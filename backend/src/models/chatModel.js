import pool from '../db/pool.js';

/**
 * Save chat message to database
 */
export const saveChatMessage = async (sessionId, userMessage, botResponse, referencedProducts = null) => {
  const query = `
    INSERT INTO chat_history (session_id, user_message, bot_response, referenced_products)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [
      sessionId,
      userMessage,
      botResponse,
      referencedProducts ? JSON.stringify(referencedProducts) : null,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
};

/**
 * Get chat history for session
 */
export const getChatHistory = async (sessionId, limit = 20) => {
  const query = `
    SELECT * FROM chat_history
    WHERE session_id = $1
    ORDER BY created_at DESC
    LIMIT $2;
  `;

  try {
    const result = await pool.query(query, [sessionId, limit]);
    return result.rows.reverse();
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
};

/**
 * Create or update chat session
 */
export const createChatSession = async (sessionId, customerEmail = null, customerName = null, ipAddress = null) => {
  const query = `
    INSERT INTO chat_sessions (session_id, customer_email, customer_name, ip_address)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (session_id) DO UPDATE SET last_activity = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [sessionId, customerEmail, customerName, ipAddress]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/updating chat session:', error);
    throw error;
  }
};

/**
 * Save products to database
 */
export const saveProducts = async (products) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing products
    await client.query('TRUNCATE TABLE products');

    // Insert new products
    const query = `
      INSERT INTO products (haravan_id, title, description, price, compare_at_price, image_url, handle, vendor, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (haravan_id) DO UPDATE
      SET title = $2, description = $3, price = $4, compare_at_price = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP;
    `;

    for (const product of products) {
      const variant = product.variants?.[0] || {};
      await client.query(query, [
        product.id,
        product.title,
        product.body_html?.replace(/<[^>]*>/g, '') || null,
        variant.price || 0,
        variant.compare_at_price || null,
        product.images?.[0]?.src || product.image?.src || null,
        product.handle,
        product.vendor,
        product.status,
      ]);
    }

    await client.query('COMMIT');
    console.log(`✅ Saved ${products.length} products to database`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving products:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all products from database
 */
export const getAllProducts = async () => {
  const query = 'SELECT * FROM products ORDER BY title ASC;';
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

/**
 * Search products in database
 */
export const searchProductsInDb = async (keyword) => {
  const query = `
    SELECT * FROM products
    WHERE title ILIKE $1 OR description ILIKE $1 OR vendor ILIKE $1
    LIMIT 5;
  `;

  try {
    const result = await pool.query(query, [`%${keyword}%`]);
    return result.rows;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

export default {
  saveChatMessage,
  getChatHistory,
  createChatSession,
  saveProducts,
  getAllProducts,
  searchProductsInDb,
};
