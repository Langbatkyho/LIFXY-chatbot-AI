import express from 'express';
import { getAllProducts, searchProductsInDb } from '../models/chatModel.js';
import { productCache } from '../utils/cache.js';

const router = express.Router();

/**
 * GET /api/products
 * Get all products
 */
router.get('/', async (req, res) => {
  try {
    // Try to get from cache first
    let products = productCache.get();

    if (!products) {
      products = await getAllProducts();
      if (products.length > 0) {
        productCache.set(products);
      }
    }

    return res.json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Error getting products:', error);
    return res.status(500).json({
      error: 'Failed to get products',
      details: error.message,
    });
  }
});

/**
 * GET /api/products/search?q=keyword
 * Search products
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters',
      });
    }

    const results = await searchProductsInDb(q);

    return res.json({
      query: q,
      count: results.length,
      products: results,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return res.status(500).json({
      error: 'Failed to search products',
      details: error.message,
    });
  }
});

/**
 * GET /api/products/:id
 * Get single product details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    let products = productCache.get();
    if (!products) {
      products = await getAllProducts();
      if (products.length > 0) {
        productCache.set(products);
      }
    }

    const product = products.find(p => p.haravan_id === parseInt(id));

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    return res.json(product);
  } catch (error) {
    console.error('Error getting product:', error);
    return res.status(500).json({
      error: 'Failed to get product',
      details: error.message,
    });
  }
});

export default router;
