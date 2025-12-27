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

    const fields = 'id,title,body_html,vendor,product_type,handle,status,published_at,created_at,images,variants';
    const pageSize = Math.min(limit || 250, 250); // Haravan often caps at 250

    let allProducts = [];
    let currentPage = 1;
    let hasMore = true;

    const client = createHaravanClient(baseUrl);

    while (hasMore) {
      try {
        console.log(`📄 Fetching page ${currentPage} (${pageSize} products per page)`);
        
        // Haravan uses 'limit' and 'page' for pagination (page is 1-indexed)
        const params = {
          limit: pageSize,
          page: currentPage,
          fields: fields,
          status: 'active', // Only fetch active products
        };

        const response = await client.get('/products.json', { params });
        const products = response.data?.products || [];
        const pagination = response.data?.pagination || {};

        console.log(`📄 Page ${currentPage}: API returned ${products.length} products`);
        console.log(`   Pagination info:`, JSON.stringify(pagination));
        console.log(`   Response headers:`, JSON.stringify({
          link: response.headers.link,
          'x-page-info': response.headers['x-page-info'],
          'x-total': response.headers['x-total'],
          'x-total-pages': response.headers['x-total-pages'],
        }));

        if (!products || products.length === 0) {
          console.log(`✅ No products found on page ${currentPage}`);
          hasMore = false;
          break;
        }

        allProducts = allProducts.concat(products);
        console.log(`📦 Running total: ${allProducts.length} products`);

        // Check if there are more pages
        // Haravan may provide pagination info in response body or headers
        const hasNextPage = (pagination.has_next_page !== false) && 
                           (response.headers['x-total-pages'] ? 
                            currentPage < parseInt(response.headers['x-total-pages']) : 
                            products.length >= pageSize);

        if (hasNextPage) {
          currentPage++;
        } else {
          console.log(`✅ Reached last page`);
          hasMore = false;
        }
      } catch (error) {
        const status = error?.response?.status;
        console.error(`❌ Error at page ${currentPage}:`, error.message);
        console.error(`   Status: ${status}`);
        console.error(`   URL: ${error?.config?.url}`);
        
        // If 404/401 on first request, try CHAPI fallback
        if (currentPage === 1 && config.haravan.fallbackToChapi && (status === 404 || status === 401)) {
          const fallbackBase = `https://chapi.myharavan.com/${config.haravan.apiVersion || '2024-07'}`;
          console.warn(`↪️ Fallback to CHAPI: ${fallbackBase}`);
          
          const fallbackClient = createHaravanClient(fallbackBase);
          let fallbackPage = 1;
          let fallbackHasMore = true;
          
          while (fallbackHasMore) {
            try {
              console.log(`📄 CHAPI: Fetching page ${fallbackPage}`);
              const params = {
                limit: pageSize,
                page: fallbackPage,
                fields: fields,
                status: 'active',
              };
              const resp = await fallbackClient.get('/products.json', { params });
              const products = resp.data?.products || [];
              const pagination = resp.data?.pagination || {};
              
              console.log(`📦 CHAPI Page ${fallbackPage}: Got ${products.length} products (running total: ${allProducts.length + products.length})`);
              
              if (!products || products.length === 0) {
                fallbackHasMore = false;
                break;
              }
              
              allProducts = allProducts.concat(products);
              
              const hasNextPage = (pagination.has_next_page !== false) && 
                                 (resp.headers['x-total-pages'] ? 
                                  fallbackPage < parseInt(resp.headers['x-total-pages']) : 
                                  products.length >= pageSize);

              if (hasNextPage) {
                fallbackPage++;
              } else {
                fallbackHasMore = false;
              }
            } catch (e) {
              console.error(`❌ CHAPI fetch failed at page ${fallbackPage}:`, e.message);
              fallbackHasMore = false;
            }
          }
          
          hasMore = false; // exit main loop
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
      console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
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

