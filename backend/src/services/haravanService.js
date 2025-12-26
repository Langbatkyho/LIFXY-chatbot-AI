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
export const fetchAllProducts = async (limit = 250) => {
  try {
    const baseUrl = getHaravanBaseUrl();
    const token = config.haravan.accessToken ? '✓ SET' : '❌ NOT_SET';
    console.log(`🔗 Haravan Shop URL: ${config.haravan.shopUrl || '(not set)'}`);
    console.log(`📡 API Base URL: ${baseUrl}`);
    console.log(`🧭 API Mode: ${config.haravan.apiMode || (config.haravan.shopUrl ? 'admin' : 'commerce')}`);
    console.log(`🔑 Access Token: ${token}`);

    let allProducts = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const params = {
        limit: limit,
        page: page,
        fields: 'id,title,body_html,vendor,product_type,handle,status,published_at,created_at,images,variants',
        // Filter for published/visible products only
        status: 'active', // or 'active' for published products
      };

      const fullUrl = `${baseUrl}/products.json`;
      console.log(`📄 Request: GET ${fullUrl} page=${page} limit=${limit}`);

      let client = createHaravanClient(baseUrl);
      try {
        const response = await client.get('/products.json', { params });
        const pageProducts = response.data.products || [];
        
        if (pageProducts.length === 0) {
          console.log(`✅ No more products found at page ${page}`);
          hasMore = false;
        } else {
          console.log(`📦 Page ${page}: Fetched ${pageProducts.length} products (total: ${allProducts.length + pageProducts.length})`);
          allProducts = allProducts.concat(pageProducts);
          
          // Check if we got fewer products than limit (last page)
          if (pageProducts.length < limit) {
            hasMore = false;
            console.log(`✅ Reached last page (${pageProducts.length} < ${limit})`);
          } else {
            page++;
          }
        }
      } catch (error) {
        const status = error?.response?.status;
        const shouldFallback = config.haravan.fallbackToChapi && (status === 404 || status === 401);
        
        if (shouldFallback && page === 1) {
          // Only fallback on first request to avoid fallback loop
          const fallbackBase = `https://chapi.myharavan.com/${config.haravan.apiVersion || '2024-07'}`;
          console.warn(`↪️  Fallback to CHAPI: ${fallbackBase}/products.json`);
          
          // Restart with CHAPI
          const fallbackParams = {
            limit: limit,
            page: page,
            fields: 'id,title,body_html,vendor,product_type,handle,status,published_at,created_at,images,variants',
          };
          
          client = createHaravanClient(fallbackBase);
          let fallbackPage = 1;
          let fallbackHasMore = true;
          
          while (fallbackHasMore) {
            fallbackParams.page = fallbackPage;
            try {
              const resp = await client.get('/products.json', { params: fallbackParams });
              const pageProducts = resp.data.products || [];
              
              if (pageProducts.length === 0) {
                fallbackHasMore = false;
              } else {
                console.log(`📦 CHAPI Page ${fallbackPage}: Fetched ${pageProducts.length} products (total: ${allProducts.length + pageProducts.length})`);
                allProducts = allProducts.concat(pageProducts);
                
                if (pageProducts.length < limit) {
                  fallbackHasMore = false;
                } else {
                  fallbackPage++;
                }
              }
            } catch (e) {
              console.error(`❌ CHAPI page ${fallbackPage} failed:`, e.message);
              fallbackHasMore = false;
            }
          }
          
          hasMore = false; // Exit main loop
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ Successfully fetched ${allProducts.length} total products from Haravan`);
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

