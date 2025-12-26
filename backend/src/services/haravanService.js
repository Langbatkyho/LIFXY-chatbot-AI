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
 * Fetch all products from Haravan
 */
export const fetchAllProducts = async (limit = 250) => {
  try {
    // Debug logging
    const baseUrl = getHaravanBaseUrl();
    const token = config.haravan.accessToken ? '✓ SET' : '❌ NOT_SET';
    console.log(`🔗 Haravan Shop URL: ${config.haravan.shopUrl || '(not set)'}`);
    console.log(`📡 API Base URL: ${baseUrl}`);
    console.log(`🧭 API Mode: ${config.haravan.apiMode || (config.haravan.shopUrl ? 'admin' : 'commerce')}`);
    console.log(`🔑 Access Token: ${token}`);

    const params = {
      limit: limit,
      fields: 'id,title,body_html,vendor,product_type,handle,status,published_at,created_at,images,variants',
    };

    // Log full URL including base and query params
    const fullUrl = `${baseUrl}/products.json`;
    console.log(`➡️  Request: GET ${fullUrl} params=${JSON.stringify(params)}`);

    let client = createHaravanClient(baseUrl);
    try {
      const response = await client.get('/products.json', { params });
      console.log(`✅ Successfully fetched ${response.data.products?.length || 0} products from Haravan`);
      return response.data.products || [];
    } catch (error) {
      const status = error?.response?.status;
      const shouldFallback = config.haravan.fallbackToChapi && (status === 404 || status === 401);
      if (shouldFallback) {
        const fallbackBase = `https://chapi.myharavan.com/${config.haravan.apiVersion || '2024-07'}`;
        console.warn(`↪️  Fallback to CHAPI: ${fallbackBase}/products.json`);
        client = createHaravanClient(fallbackBase);
        const resp2 = await client.get('/products.json', { params });
        console.log(`✅ Fallback fetched ${resp2.data.products?.length || 0} products via CHAPI`);
        return resp2.data.products || [];
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Error fetching products from Haravan:');
    console.error('   Status:', error?.response?.status);
    console.error('   Message:', error.message);
    console.error('   URL:', error?.config?.url);
    if (error?.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

/**
 * Get single product details
 */
export const getProduct = async (productId) => {
  try {
    const response = await haravanClient.get(`/products/${productId}.json`);
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

