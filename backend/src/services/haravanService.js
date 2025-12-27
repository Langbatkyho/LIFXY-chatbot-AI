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
    const pageSize = Math.min(limit || 250, 250);

    let allProducts = [];
    let nextUrl = null;
    let pageNum = 1;

    const client = createHaravanClient(baseUrl);

    // First request
    console.log(`📄 Fetching page 1 with limit=${pageSize}`);
    
      try {
        const response = await client.get('/products.json', {
          params: {
            limit: pageSize,
            fields: fields,
            status: 'active',
          }
        });

        const products = response.data?.products || [];
        console.log(`📦 Page 1: Got ${products.length} products`);

        // Log ALL response headers to understand pagination
        console.log(`📍 Response headers:`, {
          link: response.headers.link,
          'x-page-info': response.headers['x-page-info'],
          'x-total': response.headers['x-total'],
          'x-total-pages': response.headers['x-total-pages'],
          'x-per-page': response.headers['x-per-page'],
          'content-length': response.headers['content-length'],
        });

        if (!products || products.length === 0) {
          console.log(`✅ No products found on page 1`);
          return allProducts;
        }

        allProducts = allProducts.concat(products);
        pageNum++;

        // Check for Link header (most reliable pagination method)
        const linkHeader = response.headers.link || response.headers.Link;
        if (linkHeader && /rel="next"/i.test(linkHeader)) {
          const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
          nextUrl = match ? match[1] : null;
          console.log(`🔗 Found Link header with next URL: ${nextUrl ? 'yes' : 'no'}`);
        } else {
          console.log(`📊 No Link header found. Headers available:`, Object.keys(response.headers));
        }

        // If Link header exists and works, use it for subsequent pages
        while (nextUrl) {
          try {
            console.log(`📄 Fetching next page (via Link header)...`);
            const resp = await client.get(nextUrl); // URL is absolute, so we pass it directly
            const products = resp.data?.products || [];

            console.log(`📦 Got ${products.length} products (running total: ${allProducts.length + products.length})`);

            if (products && products.length > 0) {
              allProducts = allProducts.concat(products);
            }

            // Check for next link
            const nextLinkHeader = resp.headers.link || resp.headers.Link;
            if (nextLinkHeader && /rel="next"/i.test(nextLinkHeader)) {
              const match = nextLinkHeader.match(/<([^>]+)>;\s*rel="next"/i);
              nextUrl = match ? match[1] : null;
            } else {
              nextUrl = null;
            }

            pageNum++;
            if (pageNum > 100) {
              console.warn('⚠️ Too many pages (>100), stopping pagination');
              break;
            }
          } catch (error) {
            console.error(`❌ Error fetching next page: ${error.message}`);
            nextUrl = null;
          }
        }

        // If Link header pagination didn't work, try traditional page-based pagination
        if (allProducts.length === pageSize) {
          console.log(`\n⚠️ Only got ${allProducts.length} products. Trying page-based pagination...`);
          let morePagesExist = true;
          let pageNum = 2;

          while (morePagesExist && pageNum <= 100) {
            try {
              console.log(`📄 Fetching page ${pageNum} with limit=${pageSize}`);
              const resp = await client.get('/products.json', {
                params: {
                  limit: pageSize,
                  page: pageNum,
                  fields: fields,
                  status: 'active',
                }
              });

              const products = resp.data?.products || [];
              console.log(`📦 Page ${pageNum}: Got ${products.length} products (running total: ${allProducts.length + products.length})`);

              if (!products || products.length === 0) {
                morePagesExist = false;
                break;
              }

              allProducts = allProducts.concat(products);
              pageNum++;
            } catch (error) {
              console.error(`❌ Error on page ${pageNum}: ${error.message}`);
              morePagesExist = false;
            }
          }
        }

      } catch (error) {
        const status = error?.response?.status;
        console.error(`❌ Error fetching first page:`, error.message);
        
        // If 404/401 on first request, try CHAPI fallback
        if (config.haravan.fallbackToChapi && (status === 404 || status === 401)) {
          const fallbackBase = `https://chapi.myharavan.com/${config.haravan.apiVersion || '2024-07'}`;
          console.warn(`↪️ Fallback to CHAPI: ${fallbackBase}`);

          const fallbackClient = createHaravanClient(fallbackBase);
          try {
            const resp = await fallbackClient.get('/products.json', {
              params: {
                limit: pageSize,
                fields: fields,
                status: 'active',
              }
            });

            const products = resp.data?.products || [];
            console.log(`📦 CHAPI: Got ${products.length} products on page 1`);
            allProducts = allProducts.concat(products);

            // Try Link header on CHAPI
            const linkHeader = resp.headers.link || resp.headers.Link;
            let nextUrl = null;
            if (linkHeader && /rel="next"/i.test(linkHeader)) {
              const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
              nextUrl = match ? match[1] : null;
            }

            // Fetch remaining pages via Link header
            while (nextUrl && allProducts.length < 200) { // reasonable limit
              try {
                const resp2 = await fallbackClient.get(nextUrl);
                const products = resp2.data?.products || [];
                allProducts = allProducts.concat(products);

                const nextLinkHeader = resp2.headers.link || resp2.headers.Link;
                if (nextLinkHeader && /rel="next"/i.test(nextLinkHeader)) {
                  const match = nextLinkHeader.match(/<([^>]+)>;\s*rel="next"/i);
                  nextUrl = match ? match[1] : null;
                } else {
                  nextUrl = null;
                }
              } catch (e) {
                console.error(`❌ CHAPI next page error: ${e.message}`);
                nextUrl = null;
              }
            }
          } catch (e) {
            console.error(`❌ CHAPI fallback also failed: ${e.message}`);
            throw e;
          }
        } else {
          throw error;
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

