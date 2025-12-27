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
 * Fetch all products from Haravan with pagination and status filtering
 */
export const fetchAllProducts = async (limit = 50) => {
  try {
    const baseUrl = getHaravanBaseUrl();
    const token = config.haravan.accessToken ? '✓ SET' : '❌ NOT_SET';
    console.log(`🔗 Haravan Shop URL: ${config.haravan.shopUrl || '(not set)'}`);
    console.log(`📡 API Base URL: ${baseUrl}`);
    console.log(`🧭 API Mode: ${config.haravan.apiMode || (config.haravan.shopUrl ? 'admin' : 'commerce')}`);
    console.log(`🔑 Access Token: ${token}`);

    const fields = 'id,title,body_html,vendor,product_type,handle,status,published_at,created_at,images,variants';
    
    // Haravan API supports offset pagination with limit
    // Try to fetch all products using offset pagination
    let allProducts = [];
    let offset = 0;
    const pageSize = limit || 50;
    let hasMore = true;

    const client = createHaravanClient(baseUrl);

    while (hasMore) {
      try {
        console.log(`📄 Fetching products: offset=${offset}, limit=${pageSize}`);
        
        const params = {
          limit: pageSize,
          offset: offset,
          fields: fields,
        };

        const response = await client.get('/products.json', { params });
        const products = response.data?.products || [];

        if (!products || products.length === 0) {
          console.log(`✅ No more products found at offset ${offset}`);
          hasMore = false;
          break;
        }

        // Filter for published/active products only
        const activeProducts = products.filter(p => {
          return p.status === 'active' || p.published_at;
        });

        console.log(`📦 Offset ${offset}: Found ${products.length} total, ${activeProducts.length} active products (running total: ${allProducts.length + activeProducts.length})`);
        allProducts = allProducts.concat(activeProducts);

        // If we got fewer products than requested, we've reached the end
        if (products.length < pageSize) {
          console.log(`✅ Reached end of products (got ${products.length} < requested ${pageSize})`);
          hasMore = false;
        } else {
          offset += pageSize;
        }
      } catch (error) {
        const status = error?.response?.status;
        console.error(`❌ Error at offset ${offset}:`, error.message);
        
        // If 404/401 on first request, try CHAPI fallback
        if (offset === 0 && config.haravan.fallbackToChapi && (status === 404 || status === 401)) {
          const fallbackBase = `https://chapi.myharavan.com/${config.haravan.apiVersion || '2024-07'}`;
          console.warn(`↪️ Fallback to CHAPI: ${fallbackBase}`);
          
          const fallbackClient = createHaravanClient(fallbackBase);
          let fallbackOffset = 0;
          let fallbackHasMore = true;
          
          while (fallbackHasMore) {
            try {
              const params = {
                limit: pageSize,
                offset: fallbackOffset,
                fields: fields,
              };
              const resp = await fallbackClient.get('/products.json', { params });
              const products = resp.data?.products || [];
              
              if (!products || products.length === 0) {
                fallbackHasMore = false;
                break;
              }
              
              const activeProducts = products.filter(p => p.status === 'active' || p.published_at);
              console.log(`📦 CHAPI Offset ${fallbackOffset}: Found ${products.length} total, ${activeProducts.length} active (running total: ${allProducts.length + activeProducts.length})`);
              allProducts = allProducts.concat(activeProducts);
              
              if (products.length < pageSize) {
                fallbackHasMore = false;
              } else {
                fallbackOffset += pageSize;
              }
            } catch (e) {
              console.error(`❌ CHAPI fetch failed at offset ${fallbackOffset}:`, e.message);
              fallbackHasMore = false;
            }
          }
          
          hasMore = false; // exit main loop
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ Successfully fetched ${allProducts.length} total active products from Haravan`);
    return allProducts;
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

