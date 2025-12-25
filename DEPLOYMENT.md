# Hướng dẫn Deploy CarMate Chatbot Backend lên Render.com

## Tổng quan quy trình

```
Repository GitHub
    ↓
Render Dashboard
    ↓
PostgreSQL Database
    ↓
Web Service (Node.js API)
    ↓
Production URL
```

---

## Step 1: Chuẩn bị GitHub Repository

### 1.1 Push Code lên GitHub

```bash
cd /workspaces/LIFXY-chatbot-AI

# Initialize git (if not already)
git init
git remote add origin https://github.com/Langbatkyho/LIFXY-chatbot-AI.git

# Commit all files
git add .
git commit -m "Initial chatbot backend and widget"
git branch -M main
git push -u origin main
```

### 1.2 Kiểm tra repository structure

```
LIFXY-chatbot-AI/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── package.json
│   ├── .env.example
│   ├── render.yaml
│   ├── .gitignore
│   └── README.md
├── frontend/
│   ├── ChatWidget.jsx
│   ├── ChatWidget.css
│   ├── chatbot.js
│   └── README.md
└── README.md
```

---

## Step 2: Tạo PostgreSQL Database trên Render

### 2.1 Truy cập Render Dashboard

1. Tới https://dashboard.render.com
2. Đăng nhập hoặc tạo tài khoản (có thể dùng GitHub login)

### 2.2 Tạo PostgreSQL Database

```
1. Nhấn "New +" → "PostgreSQL"
2. Điền thông tin:
   - Name: lifxy-chatbot-db
   - Database: lifxy_chatbot
   - User: postgres
   - Region: Singapore (hoặc gần nhất)
   - Plan: Free
3. Nhấn "Create Database"
4. Đợi ~2 phút tạo xong
```

### 2.3 Copy Connection String

```
Sau khi database được tạo:
1. Vào "Connections" section
2. Copy full "External Database URL"
   Ví dụ: postgresql://user:password@host:5432/dbname
3. Lưu nơi an toàn
```

---

## Step 3: Tạo Web Service trên Render

### 3.1 Tạo Web Service

```
1. Nhấn "New +" → "Web Service"
2. Connect GitHub:
   - Click "GitHub"
   - Authorize Render
   - Select repository: LIFXY-chatbot-AI
   - Phân nhánh: main
3. Điền cấu hình:
   - Name: lifxy-chatbot-api
   - Environment: Node
   - Build Command: cd backend && npm install
   - Start Command: cd backend && npm start
   - Plan: Free
4. Nhấn "Create Web Service"
```

### 3.2 Thiết lập Environment Variables

Trong Render Dashboard (Web Service):

```
1. Vào "Environment" tab
2. Thêm các biến sau:
```

| Key | Value | Ghi chú |
|-----|-------|--------|
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | |
| `DATABASE_URL` | `postgresql://...` | Copy từ database |
| `GEMINI_API_KEY` | `your_api_key` | Từ Google Cloud |
| `HARAVAN_API_KEY` | `your_api_key` | Từ Haravan |
| `HARAVAN_SHOP_ID` | `your_shop_id` | Từ Haravan |
| `ALLOWED_ORIGINS` | `https://carmate.myharavan.com` | Website URL |
| `LOG_LEVEL` | `info` | |

### 3.3 Cách lấy các API Keys

#### Google Gemini API Key

```
1. Tới https://ai.google.dev
2. Nhấn "Get API Key"
3. Chọn/tạo project
4. Nhấn "Create API key"
5. Copy key
6. Set quota nếu cần (free tier: 60 requests/minute)
```

#### Haravan API Key

```
1. Đăng nhập https://admin.myharavan.com
2. Cài đặt → Kênh bán hàng → API
3. Tạo Access Token mới
4. Copy API Key & Shop ID
5. Lưu credentials
```

---

## Step 4: Deploy và Kiểm tra

### 4.1 Xem Deploy Log

Trong Render Dashboard:
```
Web Service → "Logs" tab
Xem quá trình build & deploy
Chờ status: "Live"
```

### 4.2 Test API

```bash
# Health check
curl https://lifxy-chatbot-api.onrender.com/health

# Phản hồi mong đợi:
{
  "status": "ok",
  "service": "lifxy-chatbot-backend",
  "version": "1.0.0",
  "timestamp": "2025-12-25T10:00:00.000Z"
}
```

### 4.3 Sync Products từ Haravan

```bash
# Lấy HARAVAN_API_KEY từ environment
curl -X POST https://lifxy-chatbot-api.onrender.com/api/admin/sync-products \
  -H "Authorization: Bearer YOUR_HARAVAN_API_KEY" \
  -H "Content-Type: application/json"

# Phản hồi:
{
  "success": true,
  "message": "Successfully synced 200 products",
  "count": 200
}
```

### 4.4 Test Chat Endpoint

```bash
curl -X POST https://lifxy-chatbot-api.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Có lốp xe nào tốt không?",
    "sessionId": "test_session_123",
    "customerName": "Test User"
  }'

# Phản hồi:
{
  "response": "Dựa trên nhu cầu của bạn...",
  "referencedProducts": [...],
  "sessionId": "test_session_123"
}
```

---

## Step 5: Deploy Frontend Widget

### 5.1 Host Widget trên CDN (Vercel)

```bash
# Tạo vercel.json
cat > frontend/vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "chatbot.js",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "$1"
    }
  ]
}
EOF

# Deploy
vercel --prod --cwd frontend

# Nhận URL, ví dụ: https://chatbot-widget.vercel.app
```

### 5.2 Nhúng vào Website CarMate

Thêm vào cuối `<body>` của website:

```html
<!-- CarMate Chatbot Widget -->
<script>
  window.CarMateChat = {
    apiUrl: 'https://lifxy-chatbot-api.onrender.com'
  };
</script>
<script src="https://chatbot-widget.vercel.app/chatbot.js"></script>
```

---

## Step 6: Cấu hình Cron Job (Sync Products Định kỳ)

### 6.1 Tạo Cron Job Render

```
1. Trong Render Dashboard
2. "New +" → "Cron Job"
3. Cấu hình:
   - Name: lifxy-sync-products
   - Schedule: 0 0 * * * (Hàng ngày lúc 00:00)
   - Docker Image: curlimages/curl
   - Command: 
   curl -X POST https://lifxy-chatbot-api.onrender.com/api/admin/sync-products \
     -H "Authorization: Bearer YOUR_HARAVAN_API_KEY"
```

---

## Troubleshooting

### Database Connection Error

```bash
# Kiểm tra DATABASE_URL format
# postgresql://user:password@host:5432/dbname

# Test connection locally
psql postgresql://user:password@host:5432/dbname -c "SELECT NOW();"
```

### Build Failed

```
1. Kiểm tra logs: Render Dashboard → Logs
2. Verify package.json location: backend/package.json
3. Check Node version: engines.node >= 18
4. Clear build cache: Settings → Clear build cache
```

### API Timeout

```
Gemini API mất >10s:
- Tăng timeout trong Render settings (30s)
- Hoặc upgrade từ Free tier
```

### CORS Error

```
Kiểm tra ALLOWED_ORIGINS:
- https://carmate.myharavan.com (production)
- http://localhost:3000 (development)
```

---

## Monitoring & Logs

### View Logs Real-time

```bash
# Từ terminal (nếu cài Render CLI)
render logs lifxy-chatbot-api

# Hoặc qua dashboard:
# Render Dashboard → Web Service → Logs
```

### Check Service Status

```bash
# Health endpoint
curl https://lifxy-chatbot-api.onrender.com/admin/health

# View stats
curl -H "Authorization: Bearer YOUR_KEY" \
  https://lifxy-chatbot-api.onrender.com/api/admin/stats
```

---

## Cost Estimation

| Service | Free Tier | Chi phí |
|---------|-----------|--------|
| PostgreSQL | 90GB/month | $0 |
| Web Service | 750 hours/month | $0 |
| Bandwidth | Unlimited | $0 |
| Cron Jobs | Yes | $0 |
| **TOTAL** | - | **$0/month** |

*Upgrade khi:*
- Traffic > 750 hours/month → $7/month Pro plan

---

## Production Checklist

- [ ] Database created & backed up
- [ ] Environment variables set
- [ ] API endpoints tested
- [ ] Products synced from Haravan
- [ ] Widget embedded in website
- [ ] Cron job for product sync configured
- [ ] CORS enabled for website domain
- [ ] SSL certificate auto-enabled
- [ ] Monitoring setup complete
- [ ] Error logging enabled

---

## Next Steps

1. ✅ Deploy backend
2. ✅ Deploy widget
3. ⏳ Setup analytics (Google Analytics)
4. ⏳ Configure email notifications
5. ⏳ Setup uptime monitoring

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Google Gemini API**: https://ai.google.dev
- **Haravan API**: https://haravan.com/api
- **Project Issues**: https://github.com/Langbatkyho/LIFXY-chatbot-AI/issues

---

**Chúc mừng deployment thành công! 🎉**
