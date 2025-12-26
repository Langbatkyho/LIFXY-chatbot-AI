import axios from 'axios';
import config from '../config/index.js';

// Build Haravan API base URL with sensible defaults for CHAPI
const getHaravanBaseUrl = () => {
  const version = config.haravan.apiVersion || '2024-07';

  // If explicit base is provided, use it
  if (config.haravan.apiBase) {
    return config.haravan.apiBase.replace(/\/$/, '');
  }

  // Prefer CHAPI by default (most tokens target CHAPI)
  const chapiBase = `https://chapi.myharavan.com/${version}`;

  // If shopUrl is provided AND you intend to use shop-specific admin API,
  // construct admin API path; otherwise fallback to CHAPI.
  if (config.haravan.shopUrl) {
    const cleanShop = config.haravan.shopUrl.replace(/\/$/, '');
    return `${cleanShop}/admin/api/${version}`;
  }

  return chapiBase;
};

const haravanClient = axios.create({
  baseURL: getHaravanBaseUrl(),
  headers: {
    // Haravan admin API typically accepts either header form
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
    console.log(`🔗 Haravan Shop URL: ${config.haravan.shopUrl || '(not set, using CHAPI)'}`);
    console.log(`📡 API Base URL: ${baseUrl}`);
    console.log(`🔑 Access Token: ${token}`);

    const params = {
      limit: limit,
      fields: 'id,title,body_html,vendor,product_type,handle,status,published_at,created_at,images,variants',
    };

    // Log full URL including base and query params
    const fullUrl = `${baseUrl}/products.json`;
    console.log(`➡️  Request: GET ${fullUrl} params=${JSON.stringify(params)}`);

    const response = await haravanClient.get('/products.json', { params });

    console.log(`✅ Successfully fetched ${response.data.products?.length || 0} products from Haravan`);
    return response.data.products || [];
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

export default haravanClient;
