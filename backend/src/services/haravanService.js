import axios from 'axios';
import config from '../config/index.js';

// Build Haravan API base URL: supports 'commerce', 'admin', 'chapi'
const getHaravanBaseUrl = () => {
  const version = config.haravan.apiVersion || '2024-07';

  // If explicit base is provided, use it
  if (config.haravan.apiBase) {
    return config.haravan.apiBase.replace(/\/$/, '');
  }

  const mode = (config.haravan.apiMode || (config.haravan.shopUrl ? 'admin' : 'commerce')).toLowerCase();

  if (mode === 'commerce') {
    return 'https://apis.haravan.com/com';
  }

  if (mode === 'admin') {
    if (!config.haravan.shopUrl) {
      throw new Error('HARAVAN_SHOP_URL is required for admin API mode');
    }
    const cleanShop = config.haravan.shopUrl.replace(/\/$/, '');
    return `${cleanShop}/admin/api/${version}`;
  }

  // mode === 'chapi'
  return `https://chapi.myharavan.com/${version}`;
};

const createHaravanClient = (base) => axios.create({
  baseURL: base,
  headers: {
    'X-Access-Token': config.haravan.accessToken,
    'Authorization': `Bearer ${config.haravan.accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Fetch all products from Haravan with cursor-based pagination (since_id)
 * Following Haravan best practices from official documentation
 */
export const fetchAllProducts = async (limit = 250) => {
  try {
    const baseUrl = getHaravanBaseUrl();
    const token = config.haravan.accessToken ? '✓ SET' : '❌ NOT_SET';
    console.log(`🔗 Haravan Shop URL: ${config.haravan.shopUrl || '(not set)'}`);
    console.log(`📡 API Base URL: ${baseUrl}`);
    console.log(`🧭 API Mode: ${config.haravan.apiMode || (config.haravan.shopUrl ? 'admin' : 'commerce')}`);
    console.log(`🔑 Access Token: ${token}`);

    // Optimize fields to reduce payload size
    const fields = 'id,title,body_html,vendor,product_type,handle,status,published_at,created_at,images,variants';
    const pageSize = Math.min(limit || 250, 250);

    let allProducts = [];
    let sinceId = 0; // Start from beginning
    let pageNum = 1;
    let hasMore = true;

    const client = createHaravanClient(baseUrl);

    // Helper function to delay between requests for rate limiting
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper function to check rate limit and wait if needed
    const checkRateLimit = (headers) => {
      const callLimit = headers['x-haravan-api-call-limit'];
      if (callLimit) {
        const [current, max] = callLimit.split('/').map(Number);
        const remaining = max - current;
        console.log(`📊 Rate limit: ${current}/${max} (${remaining} remaining)`);
        
        // If less than 10 requests remaining, wait to avoid 429
        if (remaining < 10) {
          console.log('⚠️ Approaching rate limit, waiting 5 seconds...');
          return delay(5000);
        }
      }
      // Safe delay between requests (250ms = 4 req/s, matching leak rate)
      return delay(250);
    };

    // Cursor-based pagination using since_id (recommended by Haravan)
    console.log(`🚀 Starting cursor-based pagination with limit=${pageSize}`);
    
    while (hasMore) {
      try {
        const params = {
          limit: pageSize,
          fields: fields,
          status: 'active',
        };

        // Add since_id for pagination (skip on first request)
        if (sinceId > 0) {
          params.since_id = sinceId;
        }

        console.log(`📄 Fetching page ${pageNum}${sinceId > 0 ? ` (since_id: ${sinceId})` : ''}...`);

        const response = await client.get('/products.json', { params });

        const products = response.data?.products || [];
        console.log(`📦 Page ${pageNum}: Got ${products.length} products (total: ${allProducts.length + products.length})`);

        // Check rate limit before continuing
        await checkRateLimit(response.headers);

        if (!products || products.length === 0) {
          console.log(`✅ No more products. Pagination complete.`);
          hasMore = false;
          break;
        }

        allProducts = allProducts.concat(products);

        // Get last product ID for next iteration  
        const lastProduct = products[products.length - 1];
        sinceId = lastProduct.id;
        pageNum++;

        // Safety check to prevent infinite loops
        if (pageNum > 1000) {
          console.warn('⚠️ Reached maximum page limit (1000), stopping');
          hasMore = false;
        }

      } catch (error) {
        const status = error?.response?.status;

        // Handle 429 Too Many Requests
        if (status === 429) {
          const retryAfter = error.response?.headers['retry-after'] || 5;
          console.warn(`⏳ Rate limit hit (429), waiting ${retryAfter} seconds...`);
          await delay(retryAfter * 1000);
          continue; // Retry same request
        }

        // Handle 404/401 with CHAPI fallback
        if (config.haravan.fallbackToChapi && (status === 404 || status === 401) && pageNum === 1) {
          console.warn(`↪️ Primary API failed, trying CHAPI fallback...`);
          return await fetchAllProductsFromChapi(pageSize, fields);
        }

        console.error(`❌ Error fetching products:`, error.message);
        throw error;
      }
    }

    console.log(`✅ Successfully fetched ${allProducts.length} total products from Haravan`);
    return allProducts;
  } catch (error) {
    console.error('❌ Error in fetchAllProducts:');
    console.error('   Status:', error?.response?.status);
    console.error('   Message:', error.message);
    console.error('   URL:', error?.config?.url);
    if (error?.response?.data) {
      console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

/**
 * Fallback method using CHAPI endpoint with cursor-based pagination
 */
const fetchAllProductsFromChapi = async (pageSize, fields) => {
  const fallbackBase = `https://chapi.myharavan.com/${config.haravan.apiVersion || '2024-07'}`;
  console.log(`📡 Using CHAPI: ${fallbackBase}`);

  const client = createHaravanClient(fallbackBase);
  let allProducts = [];
  let sinceId = 0;
  let pageNum = 1;
  let hasMore = true;

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  while (hasMore && pageNum <= 100) {
    try {
      const params = {
        limit: pageSize,
        fields: fields,
        status: 'active',
      };

      if (sinceId > 0) {
        params.since_id = sinceId;
      }

      console.log(`📄 CHAPI page ${pageNum}${sinceId > 0 ? ` (since_id: ${sinceId})` : ''}...`);

      const response = await client.get('/products.json', { params });
      const products = response.data?.products || [];

      console.log(`📦 CHAPI page ${pageNum}: Got ${products.length} products (total: ${allProducts.length + products.length})`);

      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      allProducts = allProducts.concat(products);

      // Get last product ID for next iteration
      sinceId = products[products.length - 1].id;
      pageNum++;

      await delay(250); // Rate limiting

    } catch (error) {
      if (error?.response?.status === 429) {
        const retryAfter = error.response?.headers['retry-after'] || 5;
        console.warn(`⏳ CHAPI rate limit, waiting ${retryAfter}s...`);
        await delay(retryAfter * 1000);
        continue;
      }
      console.error(`❌ CHAPI error: ${error.message}`);
      throw error;
    }
  }

  console.log(`✅ CHAPI fetched ${allProducts.length} products`);
  return allProducts;
};

/**
 * Get single product details
 */
export const getProduct = async (productId) => {
  try {
    const baseUrl = getHaravanBaseUrl();
    const client = createHaravanClient(baseUrl);
    const response = await client.get(`/products/${productId}.json`);
    return response.data.product;
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error.message);
    throw error;
  }
};

/**
 * Format product for AI context
 */
export const formatProductForAI = (product) => {
  const variant = product.variants?.[0] || {};
  
  return {
    id: product.id,
    title: product.title,
    price: variant.price || 0,
    compare_at_price: variant.compare_at_price,
    description: product.body_html?.replace(/<[^>]*>/g, '') || '',
    image: product.images?.[0]?.src || product.image?.src,
    vendor: product.vendor,
    handle: product.handle,
    status: product.status,
    variants: product.variants?.map(v => ({
      id: v.id,
      title: v.title,
      price: v.price,
      sku: v.sku,
      inventory_quantity: v.inventory_quantity,
    })) || [],
  };
};

/**
 * Search products by keyword
 */
export const searchProducts = async (keyword, products) => {
  const lowerKeyword = keyword.toLowerCase();
  
  return products.filter(product => 
    product.title.toLowerCase().includes(lowerKeyword) ||
    product.description?.toLowerCase().includes(lowerKeyword) ||
    product.vendor?.toLowerCase().includes(lowerKeyword)
  ).slice(0, 5);
};

export default {
  fetchAllProducts,
  getProduct,
  formatProductForAI,
  searchProducts,
};

