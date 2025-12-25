import express from 'express';
import { fetchAllProducts } from '../services/haravanService.js';
import { saveProducts, getAllProducts } from '../models/chatModel.js';
import { productCache } from '../utils/cache.js';

const router = express.Router();

/**
 * POST /api/admin/sync-products
 * Sync products from Haravan to database
 * Requires authorization header
 */
router.post('/sync-products', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = process.env.HARAVAN_API_KEY;

    // Simple auth check
    if (!authHeader || !authHeader.includes(apiKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    console.log('📦 Starting product sync from Haravan...');

    // Fetch all products from Haravan
    const products = await fetchAllProducts();
    console.log(`✅ Fetched ${products.length} products from Haravan`);

    // Save to database
    await saveProducts(products);

    // Clear cache
    productCache.clear();
    console.log('🗑️ Cache cleared');

    return res.json({
      success: true,
      message: `Successfully synced ${products.length} products`,
      count: products.length,
    });
  } catch (error) {
    console.error('Error syncing products:', error);
    return res.status(500).json({
      error: 'Failed to sync products',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/stats
 * Get admin statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = process.env.HARAVAN_API_KEY;

    if (!authHeader || !authHeader.includes(apiKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const products = await getAllProducts();
    const cacheStats = productCache.getStats?.();

    return res.json({
      products: {
        total: products.length,
      },
      cache: cacheStats || {
        keys: productCache.has() ? 1 : 0,
        ksize: 0,
        vsize: 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return res.status(500).json({
      error: 'Failed to get stats',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
