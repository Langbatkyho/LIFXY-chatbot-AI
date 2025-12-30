import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeDatabase } from './db/pool.js';
import config from './config/index.js';
import { fetchAllProducts } from './services/haravanService.js';
import { saveProducts, getAllProducts } from './models/chatModel.js';
import { productCache } from './utils/cache.js';

// Routes
import chatRoutes from './routes/chatRoutes.js';
import productRoutes from './routes/productRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize database
try {
  await initializeDatabase();
  console.log('✅ Database initialized');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

// Auto-sync products from Haravan on startup (DISABLED by default to prevent deployment timeouts)
// To enable, set AUTO_SYNC_PRODUCTS=true in environment variables
// Use POST /api/admin/sync-products to manually trigger sync
const autoSyncProducts = async () => {
  // Only sync if Haravan credentials are configured
  if (!config.haravan.accessToken) {
    console.log('⏭️  Haravan access token not configured, skipping auto-sync');
    return;
  }

  try {
    console.log('🔄 Starting auto-sync of products on server startup...');
    
    // Fetch all products from Haravan
    const products = await fetchAllProducts();
    console.log(`✅ Fetched ${products.length} products from Haravan`);

    if (products.length === 0) {
      console.log('⚠️  No products fetched from Haravan');
      return;
    }

    // Save to database (will truncate and recreate)
    await saveProducts(products);
    console.log(`✅ Saved ${products.length} products to database`);

    // Clear cache
    productCache.clear();
    console.log('🗑️ Cache cleared');
  } catch (error) {
    console.error('❌ Auto-sync failed:', error.message);
    // Don't exit - allow server to run even if sync fails
  }
};

// Auto-sync DISABLED by default - change to 'true' to enable
// This prevents deployment timeouts when syncing large product catalogs
if (process.env.AUTO_SYNC_PRODUCTS === 'true') {
  console.log('⚙️  Auto-sync enabled via AUTO_SYNC_PRODUCTS=true');
  autoSyncProducts();
} else {
  console.log('⏭️  Auto-sync disabled. Use POST /api/admin/sync-products to manually sync.');
}

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lifxy-chatbot-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CarMate Chatbot Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      chat: '/api/chat',
      products: '/api/products',
      admin: '/api/admin',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  CarMate Chatbot Backend               ║
║  Server running on port ${PORT}          ║
║  Environment: ${config.env}             ║
║  Gemini AI: Enabled                    ║
║  Haravan Integration: Enabled          ║
╚═══════════════════════════════════════╝
  `);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

export default app;
