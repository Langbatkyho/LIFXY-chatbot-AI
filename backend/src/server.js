import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeDatabase } from './db/pool.js';
import config from './config/index.js';

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
