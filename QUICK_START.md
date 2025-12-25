# 🚀 QUICK START GUIDE - CarMate Chatbot

## Chỉ cần 5 bước để deploy lên Render.com

---

## **BƯỚC 1: Chuẩn bị API Keys (5 phút)**

### Google Gemini API
```
1. Tới https://ai.google.dev
2. Click "Get API Key"
3. Copy GEMINI_API_KEY
```

### Haravan API
```
1. Login https://admin.myharavan.com
2. Settings → API & Integrations → Create token
3. Copy HARAVAN_API_KEY và HARAVAN_SHOP_ID
```

---

## **BƯỚC 2: Tạo PostgreSQL trên Render (3 phút)**

```
1. Tới https://dashboard.render.com
2. Đăng nhập hoặc dùng GitHub
3. Click "New +" → "PostgreSQL"
4. Điền:
   - Name: lifxy-chatbot-db
   - Region: Singapore
   - Plan: Free
5. Click "Create Database"
6. ⏱️ Đợi ~2 phút
7. Copy "External Database URL" → Lưu nơi an toàn
```

**Kết quả:**
```
DATABASE_URL: postgresql://user:pass@host:5432/dbname
```

---

## **BƯỚC 3: Deploy Backend lên Render (5 phút)**

```
1. Tới https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Click "GitHub" → Authorize
4. Select repository: LIFXY-chatbot-AI
5. Điền:
   - Name: lifxy-chatbot-api
   - Environment: Node
   - Build Command: cd backend && npm install
   - Start Command: cd backend && npm start
   - Plan: Free
6. Click "Create Web Service"
7. ⏱️ Đợi build (2-3 phút)
```

---

## **BƯỚC 4: Set Environment Variables (2 phút)**

Trong Render Dashboard (Web Service):

```
Click "Environment" tab

Thêm các biến:
- NODE_ENV: production
- PORT: 3001
- DATABASE_URL: (from step 2)
- GEMINI_API_KEY: (from step 1)
- HARAVAN_API_KEY: (from step 1)
- HARAVAN_SHOP_ID: (from step 1)
- ALLOWED_ORIGINS: https://carmate.myharavan.com
```

**Click "Save" → Tự động deploy lại**

---

## **BƯỚC 5: Verify & Sync Products (2 phút)**

### Test API
```bash
curl https://lifxy-chatbot-api.onrender.com/health
```

### Sync Products
```bash
curl -X POST https://lifxy-chatbot-api.onrender.com/api/admin/sync-products \
  -H "Authorization: Bearer YOUR_HARAVAN_API_KEY"
```

**Kết quả:**
```json
{
  "success": true,
  "message": "Successfully synced 200 products",
  "count": 200
}
```

---

## **BƯỚC 6: Embed vào Website (1 phút)**

Thêm vào cuối thẻ `<body>` của website carmate.myharavan.com:

```html
<!-- CarMate Chatbot Widget -->
<script>
  window.CarMateChat = {
    apiUrl: 'https://lifxy-chatbot-api.onrender.com'
  };
</script>
<script src="https://chatbot-widget-url/chatbot.js"></script>
```

---

## ✅ Checklist Deploy

- [ ] Google Gemini API Key obtained
- [ ] Haravan API credentials obtained
- [ ] PostgreSQL database created on Render
- [ ] Web Service deployed on Render
- [ ] Environment variables set
- [ ] API health check passed
- [ ] Products synced from Haravan (200+ products)
- [ ] Widget embedded on website
- [ ] Test chat working

---

## 🧪 Quick Test

### Test Chat
```bash
curl -X POST https://lifxy-chatbot-api.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Có lốp xe nào tốt?",
    "sessionId": "test_123"
  }'
```

**Expected Response:**
```json
{
  "response": "Dựa trên nhu cầu...",
  "referencedProducts": [
    {"id": 1, "title": "Lốp Bridgestone", "price": 1500000}
  ],
  "sessionId": "test_123"
}
```

---

## 🆘 Troubleshooting

### Database Connection Error
```
✗ Error: connect ECONNREFUSED

→ Check DATABASE_URL format
→ Must be: postgresql://user:pass@host:5432/dbname
```

### Build Failed
```
✗ npm: not found

→ Go to Render → Web Service → Settings
→ Clear build cache
→ Re-deploy
```

### Gemini Timeout
```
✗ Timeout after 30s

→ Check GEMINI_API_KEY is correct
→ Verify quota not exceeded
```

### CORS Error on Website
```
✗ Access to XMLHttpRequest blocked

→ Check ALLOWED_ORIGINS variable
→ Must include: https://carmate.myharavan.com
```

---

## 📊 Monitoring

### View Logs
```
Render Dashboard 
→ Web Service 
→ Logs tab
```

### Check Status
```bash
curl https://lifxy-chatbot-api.onrender.com/admin/health
```

---

## 💰 Cost

**COMPLETELY FREE** 🎉

- PostgreSQL: $0/month (90GB)
- Web Service: $0/month (750 hours)
- Bandwidth: Unlimited
- **Total: $0/month**

Upgrade to Pro ($7/month) only if you exceed 750 hours/month.

---

## 📚 Full Documentation

- **Backend**: [backend/README.md](backend/README.md)
- **Frontend**: [frontend/README.md](frontend/README.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Summary**: [SUMMARY.md](SUMMARY.md)

---

## ⏱️ Total Time

```
Google Gemini API:    5 min
Haravan API:          5 min
PostgreSQL Setup:     3 min
Web Service Deploy:   5 min
Environment Setup:    2 min
Verification:         2 min
Widget Embedding:     1 min
─────────────────────
TOTAL:               ~23 minutes
```

---

## 🎯 Next Steps (After Deploy)

1. **Monitor**: Check logs daily
2. **Backup**: Enable Render backups
3. **Analyze**: Setup Google Analytics
4. **Optimize**: Monitor chat quality
5. **Scale**: Upgrade if needed

---

## 📞 Need Help?

- GitHub Issues: https://github.com/Langbatkyho/LIFXY-chatbot-AI/issues
- Email: support@carmate.com
- Render Support: https://render.com/support
- Gemini API Docs: https://ai.google.dev/docs

---

**Ready to launch? 🚀 Let's go!**

*Created: December 25, 2025*
