# 📋 Checklist Deploy CarMate Chatbot lên Render

## Pre-Deployment Checklist

Hoàn thành những bước này trước khi deploy:

### 1. Chuẩn bị API Keys
- [ ] Lấy Google Gemini API key từ https://ai.google.dev
  - Save trong file an toàn
- [ ] Lấy Haravan Shop ID từ https://admin.myharavan.com
  - Go to Settings → API & Integrations
- [ ] Lấy Haravan API Key
  - Create new Access Token if needed

### 2. Kiểm tra Code
- [ ] Code đã push lên GitHub main branch
- [ ] `git log` hiển thị commits mới nhất
- [ ] Repository public (hoặc private nhưng có Render access)

### 3. Chuẩn bị Render Account
- [ ] Tạo account trên https://render.com
- [ ] Verify email address
- [ ] Kết nối GitHub account
  - Render Dashboard → Settings → GitHub

---

## Deployment Steps

### Step 1: Create PostgreSQL Database ✅
**Estimated time: 2-3 minutes**

- [ ] Go to https://dashboard.render.com
- [ ] Click "New +" → "PostgreSQL"
- [ ] Fill details:
  - [ ] Name: `lifxy-chatbot-db`
  - [ ] Database: `lifxy_chatbot`
  - [ ] User: `postgres`
  - [ ] Region: Singapore (or nearest)
  - [ ] Plan: Free
- [ ] Click "Create Database"
- [ ] ⏳ Wait for "Running" status
- [ ] Copy "External Database URL" (full connection string)
- [ ] Save URL in secure location

**Result:** PostgreSQL URL ready

---

### Step 2: Create Web Service (Backend API) ✅
**Estimated time: 5-10 minutes**

- [ ] Render Dashboard → New → Web Service
- [ ] Select GitHub repository: `LIFXY-chatbot-AI`
- [ ] Select branch: `main`
- [ ] Configuration:
  - [ ] Name: `lifxy-chatbot-api`
  - [ ] Region: Singapore
  - [ ] Runtime: Node
  - [ ] Root Directory: `backend`
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`
  - [ ] Instance Type: Free
- [ ] Click "Create Web Service"
- [ ] ⏳ Wait for "Running" status (see "Deploying..." → "Running")

**Result:** Web service created, building...

---

### Step 3: Configure Environment Variables ✅
**Estimated time: 2 minutes**

In Render Dashboard → lifxy-chatbot-api → Settings → Environment:

Add these variables (click "Add Environment Variable" for each):

```
NODE_ENV = production
PORT = 3001
GEMINI_API_KEY = [YOUR_GEMINI_KEY]
HARAVAN_SHOP_ID = [YOUR_SHOP_ID]
HARAVAN_API_KEY = [YOUR_HARAVAN_KEY]
DATABASE_URL = [POSTGRESQL_URL_FROM_STEP_1]
ALLOWED_ORIGINS = https://carmate.myharavan.com
LOG_LEVEL = info
```

- [ ] NODE_ENV added
- [ ] PORT added
- [ ] GEMINI_API_KEY added
- [ ] HARAVAN_SHOP_ID added
- [ ] HARAVAN_API_KEY added
- [ ] DATABASE_URL added
- [ ] ALLOWED_ORIGINS added
- [ ] LOG_LEVEL added
- [ ] All variables saved (button showed "Saved")

**After adding all variables, service will restart automatically**

---

### Step 4: Verify Deployment ✅
**Estimated time: 3 minutes**

Check logs in Render Dashboard → lifxy-chatbot-api → Logs:

- [ ] Look for: "Server running on port 3001"
- [ ] Look for: "✅ Database initialized successfully"
- [ ] No error messages visible

Test health endpoint:

```bash
# Copy this in terminal
curl https://lifxy-chatbot-api.onrender.com/health

# Should return: {"status":"ok",...}
```

- [ ] Health check returned OK

---

### Step 5: Sync Products from Haravan ✅
**Estimated time: 1 minute**

Products must be synced before chatbot works!

```bash
# Replace YOUR_HARAVAN_API_KEY with actual key
curl -X POST https://lifxy-chatbot-api.onrender.com/api/admin/sync-products \
  -H "Authorization: Bearer YOUR_HARAVAN_API_KEY"

# Should return: 
# {"success":true,"message":"Successfully synced 200 products","count":200}
```

- [ ] Sync command executed
- [ ] Response shows "success": true
- [ ] Product count matches your Haravan store

---

### Step 6: Test API Endpoints ✅
**Estimated time: 2 minutes**

#### Test 1: Get All Products
```bash
curl https://lifxy-chatbot-api.onrender.com/api/products

# Should return: {"count":200,"products":[...]}
```
- [ ] Got product list

#### Test 2: Search Products
```bash
curl "https://lifxy-chatbot-api.onrender.com/api/products/search?q=lop"

# Should return: products matching "lop"
```
- [ ] Got search results

#### Test 3: Chat Message
```bash
curl -X POST https://lifxy-chatbot-api.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tôi cần lốp xe tốt",
    "sessionId": "test_123",
    "customerName": "Test"
  }'

# Should return: chatbot response + products
```
- [ ] Got chat response
- [ ] Response looks natural

#### Test 4: Chat History
```bash
curl https://lifxy-chatbot-api.onrender.com/api/chat/history/test_123

# Should return: chat history
```
- [ ] Got chat history

---

### Step 7: Deploy Frontend Widget 🚀
**Choose ONE option below**

#### Option A: Host on Vercel (EASIEST)

- [ ] Go to https://vercel.com
- [ ] Click "Add New..." → "Project"
- [ ] Import your GitHub repository
- [ ] Configuration:
  - [ ] Root Directory: `frontend`
  - [ ] Framework: None (Static)
  - [ ] Deploy
- [ ] ⏳ Wait for deployment to complete
- [ ] Copy your URL: `https://your-project.vercel.app`

#### Option B: Host on Render

- [ ] Render Dashboard → New → Static Site
- [ ] Select repository
- [ ] Configuration:
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: (leave empty)
  - [ ] Publish directory: `.`
- [ ] Deploy

#### Option C: Host on Your Own Server

- [ ] Upload `frontend/chatbot.js` to your server
- [ ] Upload `frontend/ChatWidget.css` to your server
- [ ] Get URLs to both files

---

### Step 8: Integrate Widget into Website ✅
**Estimated time: 2 minutes**

Add this code to your website (before closing `</body>` tag):

```html
<!-- CarMate Chatbot Widget - BEGIN -->
<script>
  window.CarMateChat = {
    apiUrl: 'https://lifxy-chatbot-api.onrender.com',
    theme: 'light'
  };
</script>
<script src="https://YOUR_WIDGET_URL/chatbot.js"></script>
<!-- CarMate Chatbot Widget - END -->
```

Replace `https://YOUR_WIDGET_URL` with:
- If Vercel: `https://your-project.vercel.app`
- If Render: Your static site URL
- If own server: Your server path

- [ ] Script added to website
- [ ] Correct API URL in script
- [ ] Correct widget URL in script

---

### Step 9: Test Widget on Website ✅
**Estimated time: 2 minutes**

- [ ] Go to https://carmate.myharavan.com
- [ ] Scroll down, see purple chat button (bottom right)
- [ ] Click button to open chat
- [ ] Type message: "Tôi cần lốp xe tốt"
- [ ] Got chatbot response
- [ ] See product recommendations
- [ ] Chat history saved (close and reopen, history still there)

---

### Step 10: Monitor & Maintain ✅
**Do these regularly**

#### Daily
- [ ] Check Render logs for errors
- [ ] Monitor chat messages for issues

#### Weekly
- [ ] Check Render usage/costs
- [ ] Review error logs
- [ ] Monitor API response time

#### Monthly
- [ ] Update products: Run sync command
- [ ] Check analytics
- [ ] Review user feedback
- [ ] Optimize prompts if needed

---

## Troubleshooting

### Issue: Service stuck on "Deploying"
**Solution:**
- [ ] Render Dashboard → Service → Restart Deployment
- [ ] Check build logs for errors
- [ ] Verify package.json syntax
- [ ] Check all env vars are set

### Issue: Database Connection Error
**Solution:**
- [ ] Check DATABASE_URL in env vars
- [ ] Format should be: `postgresql://user:pass@host:5432/dbname`
- [ ] Test connection: `psql "your_database_url"`
- [ ] Restart service

### Issue: Gemini API Timeout
**Solution:**
- [ ] Check API key is valid
- [ ] Check Google Cloud Console quota
- [ ] Verify network in Render logs
- [ ] Increase maxTokens in config

### Issue: Products Not Showing
**Solution:**
- [ ] Run sync products command again
- [ ] Check `/api/products` endpoint
- [ ] Verify Haravan API key
- [ ] Check database has data

### Issue: CORS Error on Website
**Solution:**
- [ ] Update ALLOWED_ORIGINS in env vars
- [ ] Include both: `https://carmate.myharavan.com` and `https://www.carmate.myharavan.com`
- [ ] Restart service
- [ ] Clear browser cache

---

## Post-Deployment

### Automate Product Sync (Optional)

Use cron-job.org for daily sync:

- [ ] Go to https://cron-job.org
- [ ] Create account
- [ ] New Cron Job:
  - [ ] Title: "CarMate Product Sync"
  - [ ] URL: `https://lifxy-chatbot-api.onrender.com/api/admin/sync-products`
  - [ ] Method: POST
  - [ ] Headers: `Authorization: Bearer YOUR_HARAVAN_API_KEY`
  - [ ] Schedule: Daily 2:00 AM
  - [ ] Save

### Monitor Performance

Check these regularly:

```bash
# Check service uptime
curl https://lifxy-chatbot-api.onrender.com/api/admin/health

# Check stats
curl https://lifxy-chatbot-api.onrender.com/api/admin/stats \
  -H "Authorization: Bearer YOUR_HARAVAN_API_KEY"
```

- [ ] Uptime is good
- [ ] Response times < 2 seconds

### Update Prompts (Optional)

To improve chatbot responses:

- [ ] Edit `backend/src/services/geminiService.js`
- [ ] Modify `systemPrompt` variable
- [ ] Commit and push
- [ ] Render auto-deploys

---

## Success Checklist

Nếu bạn đã ticked hết những items này, chatbot đã deploy thành công!

- [ ] PostgreSQL database running on Render
- [ ] Web Service running on Render
- [ ] All env vars configured
- [ ] Health check returns OK
- [ ] Products synced from Haravan
- [ ] Chat API working
- [ ] Widget hosted and accessible
- [ ] Widget integrated into website
- [ ] Chat works on live website
- [ ] User can see products in chat

---

## Support

**Render Documentation**: https://render.com/docs  
**Gemini API Docs**: https://ai.google.dev/docs  
**Haravan API**: https://chapi.myharavan.com/docs  
**GitHub Issues**: https://github.com/Langbatkyho/LIFXY-chatbot-AI/issues

**Stuck?** Check the [DEPLOYMENT.md](DEPLOYMENT.md) for more details.

---

**Last Updated**: December 25, 2025  
**Status**: ✅ Ready for Deployment
