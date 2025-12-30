/**
 * Test script to verify product sync pagination
 * This simulates the sync process to check if it fetches more than 50 products
 */

import { fetchAllProducts } from './src/services/haravanService.js';
import config from './src/config/index.js';

console.log('🧪 Testing Haravan Product Sync');
console.log('================================\n');

console.log('📋 Configuration:');
console.log(`   API Key: ${config.haravan.accessToken ? '✓ Set' : '✗ Not Set'}`);
console.log(`   Shop URL: ${config.haravan.shopUrl || '(not set)'}`);
console.log(`   API Mode: ${config.haravan.apiMode || 'auto'}`);
console.log(`   API Version: ${config.haravan.apiVersion}`);
console.log('');

if (!config.haravan.accessToken) {
  console.error('❌ HARAVAN_ACCESS_TOKEN is not configured!');
  console.log('');
  console.log('Please set environment variables:');
  console.log('   export HARAVAN_ACCESS_TOKEN="your_token_here"');
  console.log('   export HARAVAN_SHOP_URL="https://your-shop.myharavan.com" (optional)');
  process.exit(1);
}

try {
  console.log('🚀 Starting product fetch...\n');
  
  const startTime = Date.now();
  const products = await fetchAllProducts();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n📊 Results:');
  console.log('================================');
  console.log(`✅ Total products fetched: ${products.length}`);
  console.log(`⏱️  Time taken: ${duration}s`);
  console.log(`📈 Average speed: ${(products.length / duration).toFixed(1)} products/sec`);
  
  if (products.length > 50) {
    console.log('\n🎉 SUCCESS! Fetched more than 50 products.');
    console.log('   The pagination fix is working correctly!');
  } else if (products.length === 50) {
    console.log('\n⚠️  WARNING! Only 50 products fetched.');
    console.log('   This might indicate pagination is not working.');
  } else {
    console.log(`\n✓ Fetched ${products.length} products (less than 50 total available).`);
  }
  
  // Show first 5 products as sample
  console.log('\n📦 Sample products (first 5):');
  products.slice(0, 5).forEach((p, i) => {
    console.log(`   ${i + 1}. [ID: ${p.id}] ${p.title}`);
  });
  
  if (products.length > 5) {
    console.log(`   ... and ${products.length - 5} more`);
  }
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Error during sync:');
  console.error(`   ${error.message}`);
  
  if (error.response) {
    console.error(`   Status: ${error.response.status}`);
    console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
  }
  
  process.exit(1);
}
