# CarMate Chatbot Backend

Backend API cho chatbot Gemini AI được tích hợp vào website CarMate (carmate.myharavan.com)

## Features

✅ **Chatbot Gemini AI** - Tư vấn sản phẩm bằng AI  
✅ **Haravan Integration** - Lấy dữ liệu sản phẩm từ Haravan API  
✅ **Product Cache** - Cache 200 sản phẩm để tối ưu tốc độ  
✅ **Chat History** - Lưu lịch sử chat  
✅ **PostgreSQL Database** - Persistent data storage  
✅ **CORS Support** - Nhúng vào website dễ dàng  

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **AI**: Google Gemini API
- **Cache**: Node-Cache
- **Deployment**: Render.com

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── db/              # Database connection & migrations
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── package.json
├── .env.example
├── render.yaml          # Render deployment config
└── README.md
```

## Installation

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/Langbatkyho/LIFXY-chatbot-AI.git
cd backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env

# Edit .env với thông tin của bạn:
# - GEMINI_API_KEY: Từ Google Cloud Console
# - HARAVAN_API_KEY: Từ Haravan admin
# - DATABASE_URL: PostgreSQL connection string

# 4. Create local PostgreSQL database
createdb lifxy_chatbot

# 5. Run server
npm start
# hoặc dev mode
npm run dev
```

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Haravan
HARAVAN_SHOP_ID=your_shop_id
HARAVAN_API_KEY=your_haravan_api_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lifxy_chatbot

# CORS
ALLOWED_ORIGINS=https://carmate.myharavan.com,http://localhost:3000

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Chat Endpoints

```bash
# Send message to chatbot
POST /api/chat/message
{
  "message": "Tôi cần một chiếc lốp tốt cho xe sedan",
  "sessionId": "user_session_123",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}

# Response
{
  "response": "Dựa trên nhu cầu của bạn...",
  "referencedProducts": [
    { "id": 1, "title": "Lốp Bridgestone", "price": 500000 }
  ],
  "sessionId": "user_session_123"
}

# Get chat history
GET /api/chat/history/{sessionId}?limit=20
```

### Product Endpoints

```bash
# Get all products
GET /api/products

# Search products
GET /api/products/search?q=lop

# Get product detail
GET /api/products/{id}
```

### Admin Endpoints

```bash
# Sync products from Haravan (requires auth)
POST /api/admin/sync-products
Header: Authorization: Bearer {HARAVAN_API_KEY}

# Get admin stats
GET /api/admin/stats
Header: Authorization: Bearer {HARAVAN_API_KEY}

# Health check
GET /api/admin/health
```

## Deployment to Render

### Step 1: Prepare Repository

```bash
# Make sure code is pushed to GitHub
git add .
git commit -m "Initial chatbot backend"
git push origin main
```

### Step 2: Create Render Services

#### 1. PostgreSQL Database
```
1. Tới https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Name: lifxy-chatbot-db
4. Lưu DATABASE_URL (copy full URL)
```

#### 2. Web Service
```
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Configuration:
   - Name: lifxy-chatbot-api
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Plan: Free
```

#### 3. Set Environment Variables

Trong Render dashboard Web Service:
```
PORT: 3001
NODE_ENV: production
GEMINI_API_KEY: <your_gemini_api_key>
HARAVAN_API_KEY: <your_haravan_api_key>
HARAVAN_SHOP_ID: <your_shop_id>
DATABASE_URL: <from_render_postgres>
ALLOWED_ORIGINS: https://carmate.myharavan.com
```

### Step 3: Test Deployment

```bash
# Check if API is running
curl https://lifxy-chatbot-api.onrender.com/health

# Sync products from Haravan
curl -X POST https://lifxy-chatbot-api.onrender.com/api/admin/sync-products \
  -H "Authorization: Bearer YOUR_HARAVAN_API_KEY"
```

## How It Works

### Chat Flow

```
User Types Message
        ↓
API /chat/message
        ↓
Search Related Products ← Database
        ↓
Generate Context
        ↓
Call Gemini API
        ↓
Save Chat History → Database
        ↓
Return Response
```

### Product Sync Flow

```
Scheduled Cron (or Manual)
        ↓
Fetch from Haravan API
        ↓
Format Product Data
        ↓
Save to PostgreSQL
        ↓
Clear Cache
        ↓
Ready for Chatbot
```

## Getting API Keys

### Google Gemini API
1. Tới https://ai.google.dev
2. Sign in với Google account
3. Create project
4. Enable Generative AI API
5. Copy API Key

### Haravan API
1. Login vào https://admin.myharavan.com
2. Settings → API & Integrations
3. Create API access token
4. Copy Shop ID & API Key

## Troubleshooting

### Database Connection Error
```
Kiểm tra DATABASE_URL format:
postgresql://username:password@host:5432/dbname
```

### Gemini API Timeout
```
Tăng timeout trong src/config/index.js
maxTokens: 1024 (hiện tại)
```

### Products Not Showing
```
1. Chạy sync endpoint:
   POST /api/admin/sync-products
2. Check database has products
3. Clear cache
```

## Performance Optimization

- ✅ Product caching (1 hour TTL)
- ✅ Database indexing on frequently searched fields
- ✅ CORS optimization
- ✅ Connection pooling
- ✅ Response compression

## Security

- ✅ Helmet.js for HTTP headers
- ✅ API key validation
- ✅ CORS whitelist
- ✅ SQL injection prevention (parameterized queries)
- ✅ Request size limits

## Monitoring

View logs in Render dashboard:
```
https://dashboard.render.com → Web Service → Logs
```

## Next Steps

1. ✅ Deploy backend to Render
2. ⏳ Create chatbot widget (React component)
3. ⏳ Embed widget into CarMate website
4. ⏳ Setup cron job for product sync
5. ⏳ Analytics & monitoring

## Support

For issues or questions:
- GitHub Issues: https://github.com/Langbatkyho/LIFXY-chatbot-AI/issues
- Email: support@carmate.com

---

**Made with ❤️ for CarMate**
