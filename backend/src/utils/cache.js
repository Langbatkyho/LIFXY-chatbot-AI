import NodeCache from 'node-cache';

// In-memory cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export const productCache = {
  /**
   * Get cached products
   */
  get: () => {
    return cache.get('products');
  },

  /**
   * Set products in cache
   */
  set: (products) => {
    cache.set('products', products);
  },

  /**
   * Clear cache
   */
  clear: () => {
    cache.del('products');
  },

  /**
   * Check if products are cached
   */
  has: () => {
    return cache.has('products');
  },

  /**
   * Get cache stats
   */
  getStats: () => {
    return cache.getStats();
  },
};

/**
 * Cache chat history
 */
export const chatCache = {
  get: (sessionId) => {
    return cache.get(`chat_${sessionId}`);
  },

  set: (sessionId, history) => {
    cache.set(`chat_${sessionId}`, history, 86400); // 24 hours
  },

  clear: (sessionId) => {
    cache.del(`chat_${sessionId}`);
  },
};

export default cache;
