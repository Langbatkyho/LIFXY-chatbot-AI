import axios from 'axios';

// Test pagination with Haravan API
const token = process.env.HARAVAN_ACCESS_TOKEN;
const shopUrl = process.env.HARAVAN_SHOP_URL;

if (!token || !shopUrl) {
  console.error('Missing HARAVAN_ACCESS_TOKEN or HARAVAN_SHOP_URL');
  process.exit(1);
}

const client = axios.create({
  baseURL: `${shopUrl}/admin/api/2024-07`,
  headers: {
    'X-Access-Token': token,
  },
});

console.log(`\n🧪 Testing Haravan pagination...`);
console.log(`📍 Shop URL: ${shopUrl}`);
console.log(`🔑 Token: ${token.substring(0, 10)}...`);

// Test 1: Try different pagination methods
const tests = [
  {
    name: 'Page-based (page + limit)',
    params: { limit: 50, page: 1, status: 'active' },
  },
  {
    name: 'Offset + limit',
    params: { limit: 50, offset: 0, status: 'active' },
  },
  {
    name: 'Cursor-based (pagination_token)',
    params: { limit: 50, pagination_token: null, status: 'active' },
  },
  {
    name: 'Simple limit only',
    params: { limit: 250, status: 'active' },
  },
];

for (const test of tests) {
  try {
    console.log(`\n📄 Testing: ${test.name}`);
    console.log(`   Params:`, test.params);
    
    const resp = await client.get('/products.json', { params: test.params, timeout: 5000 });
    const products = resp.data?.products || [];
    
    console.log(`   ✅ Success!`);
    console.log(`   📦 Products returned: ${products.length}`);
    
    // Log pagination info from body
    if (resp.data?.pagination) {
      console.log(`   Pagination info:`, JSON.stringify(resp.data.pagination, null, 2));
    }
    
    // Log pagination headers
    const paginationHeaders = {};
    ['link', 'x-page-info', 'x-total-pages', 'x-total', 'x-next-page'].forEach(h => {
      if (resp.headers[h]) {
        paginationHeaders[h] = resp.headers[h];
      }
    });
    
    if (Object.keys(paginationHeaders).length > 0) {
      console.log(`   Headers:`, paginationHeaders);
    }
    
    // Show first product
    if (products.length > 0) {
      console.log(`   First product: ${products[0].title} (ID: ${products[0].id})`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response?.status === 404) {
      console.log(`   💡 Endpoint not found - API mode might be wrong`);
    }
  }
}

// Test 2: Try pagination with page 2
console.log(`\n📄 Testing pagination - Page 2 (page + limit)`);
try {
  const resp = await client.get('/products.json', { 
    params: { limit: 50, page: 2, status: 'active' },
    timeout: 5000 
  });
  const products = resp.data?.products || [];
  console.log(`   ✅ Page 2 returned ${products.length} products`);
  if (products.length > 0) {
    console.log(`   First product on page 2: ${products[0].title} (ID: ${products[0].id})`);
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n✨ Test complete\n');
