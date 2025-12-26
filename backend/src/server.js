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

// Auto-sync products from Haravan on startup
const autoSyncProducts = async () => {
  // Only sync if Haravan credentials are configured
  if (!config.haravan.accessToken || !config.haravan.shopUrl) {
    console.log('⏭️  Haravan not configured, skipping auto-sync');
    return;
  }

  try {
    // Check if products already exist (to optimize free tier)
    const existingProducts = await getAllProducts();
    
    if (existingProducts.length > 0) {
      console.log(`✅ Products already in database (${existingProducts.length} products), skipping sync`);
      return;
    }

    console.log('📦 Starting auto-sync of products from Haravan...');
    const startTime = Date.now();

    // Fetch from Haravan with timeout to prevent hanging on free tier
    const products = await Promise.race([
      fetchAllProducts(250),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Haravan sync timeout (30s)')), 30000)
      )
    ]);

    if (products.length === 0) {
      console.warn('⚠️  No products found from Haravan');
      return;
    }

    // Save to database
    await saveProducts(products);
    productCache.clear();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Auto-synced ${products.length} products from Haravan (${duration}s)`);
  } catch (error) {
    console.error('⚠️  Product auto-sync failed:', error.message);
    console.log('💡 Products can still be synced manually via /api/admin/sync-products');
  }
};

// Run auto-sync in background (non-blocking)
if (process.env.AUTO_SYNC_PRODUCTS !== 'false') {
  autoSyncProducts();
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
