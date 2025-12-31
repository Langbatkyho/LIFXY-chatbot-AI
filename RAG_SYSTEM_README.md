# 🤖 RAG-Enhanced Chatbot System

## 📖 Tổng quan

Hệ thống chatbot AI sử dụng kiến trúc **RAG (Retrieval-Augmented Generation)** để tư vấn sản phẩm chính xác và thông minh.

### Cách hoạt động

```
┌─────────────────────────────────────────────────────────────┐
│  1. KHÁCH HỎI: "Tôi cần đai bó gối cho xe"                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. EXTRACT KEYWORDS: ["đai", "gối", "xe"]                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. SEARCH DATABASE (Full-text + Ranking)                   │
│     → Tìm được 3 sản phẩm liên quan:                        │
│       - The ZenK Mizuno (0.95 relevance)                    │
│       - The ActivPro (0.87 relevance)                       │
│       - The BoosterX (0.82 relevance)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. BUILD CONTEXT với thông tin chi tiết:                   │
│     - 3 điểm mạnh (USP)                                     │
│     - Đối tượng sử dụng                                     │
│     - FAQ                                                    │
│     - Thông số kỹ thuật                                     │
│     - Link mua hàng                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. GEMINI AI sinh response dựa trên Master Prompt:         │
│     "Em tìm thấy 3 sản phẩm phù hợp với nhu cầu a/c:        │
│      1. The ZenK Mizuno - 985k                              │
│         ✓ Chống mỏi gối 8 giờ liên tục                     │
│         ✓ Phù hợp: Tài xế đường dài...                      │
│      Anh/chị quan tâm size nào để em tư vấn thêm ạ?"       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Deploy hệ thống (đã xong ✅)

```bash
git push origin main
# Render tự động deploy trong 2-3 phút
```

### 2. Sync sản phẩm từ Haravan

```bash
curl -X POST https://lifxy-chatbot-ai.onrender.com/api/admin/sync-products \
  -H "Authorization: Bearer YOUR_HARAVAN_TOKEN"
```

### 3. Update thông tin sản phẩm

Sử dụng file `sample-bulk-update.json` làm mẫu:

```bash
curl -X POST https://lifxy-chatbot-ai.onrender.com/api/admin/products/bulk-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HARAVAN_TOKEN" \
  -d @sample-bulk-update.json
```

### 4. Test chatbot

```bash
curl -X POST https://lifxy-chatbot-ai.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tôi cần đai bó gối",
    "sessionId": "test-123"
  }'
```

---

## 📊 Database Schema

```sql
CREATE TABLE products (
  -- Basic info
  id SERIAL PRIMARY KEY,
  haravan_id BIGINT UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(15, 2),
  image_url TEXT,
  handle VARCHAR(255),
  
  -- RAG fields (Critical!)
  usp TEXT,                    -- 3 điểm mạnh
  target_audience TEXT,        -- Đối tượng sử dụng
  faq JSONB,                   -- FAQ riêng
  specifications JSONB,        -- Thông số kỹ thuật
  
  -- Sales channels
  shopee_url TEXT,
  tiktok_url TEXT,
  
  -- Metadata
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search index
CREATE INDEX idx_products_search ON products 
USING gin(to_tsvector('english', 
  title || ' ' || COALESCE(description, '') || ' ' || COALESCE(usp, '')
));
```

---

## 🎯 Master Prompt System

### 4 Bước Tư Vấn

1. **THĂM HỎI** - Hỏi về nhu cầu cụ thể
2. **GỢI Ý** - Đề xuất 2-3 sản phẩm phù hợp với USP
3. **TƯ VẤN** - Hướng dẫn size/thông số, trả lời FAQ
4. **CHỐT ĐƠN** - Cung cấp link đa kênh (Web/Shopee/TikTok)

### Quy tắc

- ✅ CHỈ dùng thông tin từ [DỮ LIỆU SẢN PHẨM]
- ✅ KHÔNG tự bịa thông số
- ✅ Nếu không tìm thấy → Xin SĐT để gọi lại
- ✅ Xưng hô: "Anh/chị" và "em"
- ✅ Emoji phù hợp: 🚗 ✅ 💯

---

## 📝 Cách điền thông tin sản phẩm

### USP (3 điểm mạnh)

```
✓ Điểm 1: Cụ thể, đo lường được (VD: "Giảm 70% mỏi lưng")
✓ Điểm 2: So sánh đối thủ (VD: "Thoáng khí hơn 3 lần")
✓ Điểm 3: Giá trị cảm xúc (VD: "An tâm suốt hành trình")
```

### Target Audience

```
Mô tả chi tiết: Nghề nghiệp + Tình trạng + Nhu cầu

VD: "Tài xế Grab/Taxi lái xe 8-12h/ngày, thường đau lưng, 
     cần giải pháp êm ái, lắp nhanh, giá phải chăng"
```

### FAQ

```json
[
  {
    "question": "Sản phẩm này phù hợp với xe nào?",
    "answer": "Universal fit - Mọi xe từ sedan đến SUV"
  },
  {
    "question": "Bảo hành bao lâu?",
    "answer": "12 tháng đổi mới nếu lỗi nhà sản xuất"
  }
]
```

### Specifications

```json
{
  "Chất liệu": "Memory Foam + Lưới 3D",
  "Kích thước": "45x40x10cm",
  "Trọng lượng": "800g",
  "Màu sắc": "Đen, Xám, Be",
  "Xuất xứ": "Hàn Quốc"
}
```

---

## 🔧 Admin API Endpoints

### 1. Sync Products
```bash
POST /api/admin/sync-products
Authorization: Bearer TOKEN
```

### 2. Bulk Update
```bash
POST /api/admin/products/bulk-update
Content-Type: application/json
Authorization: Bearer TOKEN

Body: { "updates": [...] }
```

### 3. Single Update
```bash
PUT /api/admin/products/:haravan_id
Content-Type: application/json
Authorization: Bearer TOKEN

Body: { "usp": "...", "target_audience": "..." }
```

### 4. Statistics
```bash
GET /api/admin/stats
Authorization: Bearer TOKEN
```

Chi tiết xem: [ADMIN_API_GUIDE.md](./ADMIN_API_GUIDE.md)

---

## 🧪 Testing

### Test Search

```bash
curl "https://lifxy-chatbot-ai.onrender.com/api/products/search?q=đai%20gối"
```

### Test Chat

```bash
curl -X POST https://lifxy-chatbot-ai.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tôi cần đai bó gối cho tài xế taxi",
    "sessionId": "test-'$(date +%s)'"
  }' | jq .
```

---

## 📈 Performance

- **Search Speed**: < 100ms (Full-text index)
- **AI Response**: 2-5s (Gemini API)
- **Total Response**: < 6s

---

## 🎓 How to Improve

### 1. Thêm dữ liệu training

Điền đầy đủ USP, FAQ, Target Audience cho mọi sản phẩm

### 2. Optimize Prompt

Tinh chỉnh Master Prompt trong `promptService.js`

### 3. Fine-tune Search

Điều chỉnh relevance ranking trong `chatModel.js`

### 4. A/B Testing

So sánh response quality với/không có RAG

---

## 🆘 Troubleshooting

### Chatbot trả lời sai

- ✅ Check: Sản phẩm có USP/FAQ chưa?
- ✅ Check: Search có tìm đúng sản phẩm không?
- ✅ Check: Master Prompt có rõ ràng không?

### Search không ra kết quả

- ✅ Check: Từ khóa có trong title/description không?
- ✅ Check: Full-text index đã tạo chưa?
- ✅ Check: Stop words có lọc đúng không?

### Admin API lỗi 401

- ✅ Check: Bearer token đúng không?
- ✅ Check: Env variable `HARAVAN_ACCESS_TOKEN` đã set chưa?

---

## 📚 Resources

- [ADMIN_API_GUIDE.md](./ADMIN_API_GUIDE.md) - Hướng dẫn API chi tiết
- [sample-bulk-update.json](./sample-bulk-update.json) - Mẫu update sản phẩm
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Gemini API Docs](https://ai.google.dev/docs)

---

## 👨‍💻 Tech Stack

- **Backend**: Node.js 20 + Express
- **Database**: PostgreSQL with Full-Text Search
- **AI**: Google Gemini 2.5 Flash
- **Architecture**: RAG (Retrieval-Augmented Generation)
- **Deployment**: Render.com

---

## 📞 Support

Nếu cần hỗ trợ, liên hệ qua GitHub Issues hoặc email.

**Happy Coding! 🚀**
