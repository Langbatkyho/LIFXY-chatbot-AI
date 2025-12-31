import express from 'express';
import { fetchAllProducts } from '../services/haravanService.js';
import { saveProducts, getAllProducts, bulkUpdateProducts } from '../models/chatModel.js';
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
    const accessToken = process.env.HARAVAN_ACCESS_TOKEN;

    // Simple auth check
    if (!authHeader || !authHeader.includes(accessToken)) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    console.log('📦 Starting product sync from Haravan...');

    // Fetch all products from Haravan
    const products = await fetchAllProducts();
    console.log(`✅ Fetched ${products.length} products from Haravan`);

    if (products.length === 0) {
      return res.json({
        success: true,
        message: 'No products to sync',
        count: 0,
      });
    }

    // Save to database
    console.log('💾 Saving products to database...');
    try {
      await saveProducts(products);
      console.log(`✅ Save completed for ${products.length} products`);
    } catch (saveError) {
      console.error('❌ Save failed:', saveError);
      throw saveError;
    }

    // Clear cache
    productCache.clear();
    console.log('🗑️ Cache cleared');

    // Verify save by counting
    const savedProducts = await getAllProducts();
    console.log(`🔍 Verification: ${savedProducts.length} products in database`);

    return res.json({
      success: true,
      message: `Successfully synced ${products.length} products`,
      count: products.length,
      verified: savedProducts.length,
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
    const accessToken = process.env.HARAVAN_ACCESS_TOKEN;

    if (!authHeader || !authHeader.includes(accessToken)) {
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

/**
 * POST /api/admin/products/bulk-update
 * Bulk update product information (USP, FAQ, Target Audience, etc.)
 * 
 * Body format:
 * {
 *   "updates": [
 *     {
 *       "haravan_id": 1234567890,
 *       "usp": "✓ Chống mỏi lưng\n✓ Thoáng khí\n✓ Dễ lắp đặt",
 *       "target_audience": "Tài xế taxi, xe công nghệ lái xe đường dài",
 *       "faq": [
 *         {"question": "Size nào phù hợp?", "answer": "Universal fit cho mọi xe"},
 *         {"question": "Bảo hành bao lâu?", "answer": "12 tháng đổi mới"}
 *       ],
 *       "specifications": {
 *         "Chất liệu": "Lưới 3D thoáng khí",
 *         "Size": "43x45cm"
 *       },
 *       "shopee_url": "https://shopee.vn/product/...",
 *       "tiktok_url": "https://www.tiktok.com/@shop/..."
 *     }
 *   ]
 * }
 */
router.post('/products/bulk-update', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = process.env.HARAVAN_ACCESS_TOKEN;

    if (!authHeader || !authHeader.includes(accessToken)) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'updates array is required and must not be empty',
      });
    }

    console.log(`📝 Bulk updating ${updates.length} products...`);

    const result = await bulkUpdateProducts(updates);

    console.log(`✅ Bulk update completed: ${result.updatedCount} products updated`);
    if (result.errors.length > 0) {
      console.log(`⚠️  Errors: ${result.errors.length}`);
      console.log(result.errors);
    }

    // Clear cache after update
    productCache.clear();

    return res.json({
      success: true,
      message: `Successfully updated ${result.updatedCount} products`,
      updatedCount: result.updatedCount,
      totalRequested: updates.length,
      errors: result.errors,
    });
  } catch (error) {
    console.error('❌ Error bulk updating products:', error);
    return res.status(500).json({
      error: 'Failed to bulk update products',
      details: error.message,
    });
  }
});

/**
 * PUT /api/admin/products/:haravan_id
 * Update single product information
 */
router.put('/products/:haravan_id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = process.env.HARAVAN_ACCESS_TOKEN;

    if (!authHeader || !authHeader.includes(accessToken)) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { haravan_id } = req.params;
    const { usp, target_audience, faq, specifications, shopee_url, tiktok_url } = req.body;

    const result = await bulkUpdateProducts([{
      haravan_id: parseInt(haravan_id),
      usp,
      target_audience,
      faq,
      specifications,
      shopee_url,
      tiktok_url,
    }]);

    if (result.updatedCount === 0) {
      return res.status(404).json({
        error: 'Product not found',
        haravan_id,
      });
    }

    // Clear cache after update
    productCache.clear();

    return res.json({
      success: true,
      message: 'Product updated successfully',
      haravan_id,
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return res.status(500).json({
      error: 'Failed to update product',
      details: error.message,
    });
  }
});

export default router;
