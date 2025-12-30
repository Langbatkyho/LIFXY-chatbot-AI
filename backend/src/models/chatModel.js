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
    console.error('Error saving chat message:', error.message);
    throw new Error(`Failed to save chat message: ${error.message}`);
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
    console.error('Error getting chat history:', error.message);
    throw new Error(`Failed to get chat history: ${error.message}`);
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
    console.error('Error creating/updating chat session:', error.message);
    throw new Error(`Failed to create/update chat session: ${error.message}`);
  }
};

/**
 * Save products to database using batch insert for better performance
 */
export const saveProducts = async (products) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing products
    await client.query('TRUNCATE TABLE products');

    console.log(`💾 Saving ${products.length} products to database...`);

    // Batch insert - process in chunks of 100 for better performance
    const BATCH_SIZE = 100;
    let savedCount = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      
      // Build bulk insert query
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (const product of batch) {
        const variant = product.variants?.[0] || {};
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
        );
        values.push(
          product.id,
          product.title,
          product.body_html?.replace(/<[^>]*>/g, '') || null,
          variant.price || 0,
          variant.compare_at_price || null,
          product.images?.[0]?.src || product.image?.src || null,
          product.handle,
          product.vendor,
          product.status
        );
        paramIndex += 9;
      }

      const query = `
        INSERT INTO products (haravan_id, title, description, price, compare_at_price, image_url, handle, vendor, status)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (haravan_id) DO UPDATE
        SET title = EXCLUDED.title, description = EXCLUDED.description, price = EXCLUDED.price, 
            compare_at_price = EXCLUDED.compare_at_price, image_url = EXCLUDED.image_url, 
            updated_at = CURRENT_TIMESTAMP;
      `;

      await client.query(query, values);
      savedCount += batch.length;
      console.log(`💾 Progress: ${savedCount}/${products.length} products saved`);
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully saved ${products.length} products to database`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving products:', error.message);
    throw new Error(`Failed to save products: ${error.message}`);
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
    console.error('Error getting products:', error.message);
    throw new Error(`Failed to get products: ${error.message}`);
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
    console.error('Error searching products:', error.message);
    throw new Error(`Failed to search products: ${error.message}`);
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
