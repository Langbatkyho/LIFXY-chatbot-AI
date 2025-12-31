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

    // Remove duplicates by haravan_id (keep last occurrence)
    const uniqueProducts = [];
    const seenIds = new Set();
    for (let i = products.length - 1; i >= 0; i--) {
      if (!seenIds.has(products[i].id)) {
        seenIds.add(products[i].id);
        uniqueProducts.unshift(products[i]);
      }
    }
    
    if (uniqueProducts.length < products.length) {
      console.log(`⚠️  Removed ${products.length - uniqueProducts.length} duplicate products`);
    }

    // Batch insert - process in chunks of 100 for better performance
    const BATCH_SIZE = 100;
    let savedCount = 0;

    for (let i = 0; i < uniqueProducts.length; i += BATCH_SIZE) {
      const batch = uniqueProducts.slice(i, i + BATCH_SIZE);
      
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
      console.log(`💾 Progress: ${savedCount}/${uniqueProducts.length} products saved`);
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully saved ${uniqueProducts.length} products to database`);
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
 * Search products in database with full-text search and relevance ranking
 */
export const searchProductsInDb = async (keyword) => {
  const query = `
    SELECT 
      id, haravan_id, title, description, price, compare_at_price,
      image_url, handle, vendor, status,
      usp, target_audience, faq, specifications, shopee_url, tiktok_url,
      ts_rank(
        to_tsvector('english', 
          title || ' ' || 
          COALESCE(description, '') || ' ' || 
          COALESCE(usp, '') || ' ' ||
          COALESCE(target_audience, '')
        ), 
        plainto_tsquery('english', $1)
      ) as relevance
    FROM products 
    WHERE (
      title ILIKE $2 
      OR description ILIKE $2 
      OR vendor ILIKE $2
      OR usp ILIKE $2
      OR target_audience ILIKE $2
      OR to_tsvector('english', 
          title || ' ' || 
          COALESCE(description, '') || ' ' || 
          COALESCE(usp, '') || ' ' ||
          COALESCE(target_audience, '')
        ) @@ plainto_tsquery('english', $1)
    )
    ORDER BY relevance DESC, title ASC
    LIMIT 3;
  `;

  try {
    const result = await pool.query(query, [keyword, `%${keyword}%`]);
    return result.rows;
  } catch (error) {
    console.error('Error searching products:', error.message);
    throw new Error(`Failed to search products: ${error.message}`);
  }
};

/**
 * Bulk update product information (for admin use)
 */
export const bulkUpdateProducts = async (updates) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let updatedCount = 0;
    let errors = [];
    
    for (const update of updates) {
      try {
        const { haravan_id, usp, target_audience, faq, specifications, shopee_url, tiktok_url } = update;
        
        const query = `
          UPDATE products 
          SET 
            usp = COALESCE($2, usp),
            target_audience = COALESCE($3, target_audience),
            faq = COALESCE($4::jsonb, faq),
            specifications = COALESCE($5::jsonb, specifications),
            shopee_url = COALESCE($6, shopee_url),
            tiktok_url = COALESCE($7, tiktok_url),
            updated_at = CURRENT_TIMESTAMP
          WHERE haravan_id = $1
          RETURNING id;
        `;
        
        const result = await client.query(query, [
          haravan_id,
          usp || null,
          target_audience || null,
          faq ? JSON.stringify(faq) : null,
          specifications ? JSON.stringify(specifications) : null,
          shopee_url || null,
          tiktok_url || null
        ]);
        
        if (result.rowCount > 0) {
          updatedCount++;
        } else {
          errors.push({ haravan_id, error: 'Product not found' });
        }
      } catch (error) {
        errors.push({ haravan_id: update.haravan_id, error: error.message });
      }
    }
    
    await client.query('COMMIT');
    
    return { updatedCount, errors };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk updating products:', error.message);
    throw new Error(`Failed to bulk update products: ${error.message}`);
  } finally {
    client.release();
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
