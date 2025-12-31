# Admin API Guide - RAG System

## 🔐 Authentication

All admin endpoints require Bearer token authentication:

```bash
Authorization: Bearer YOUR_HARAVAN_ACCESS_TOKEN
```

---

## 📝 Bulk Update Products

### Endpoint
```
POST /api/admin/products/bulk-update
```

### Description
Bulk update product information for RAG system (USP, Target Audience, FAQ, Specifications, Links)

### Request Body Format

```json
{
  "updates": [
    {
      "haravan_id": 1234567890,
      "usp": "✓ Chống mỏi lưng 8 giờ liên tục\n✓ Thoáng khí công nghệ lưới 3D\n✓ Dễ lắp đặt trong 30 giây",
      "target_audience": "Tài xế taxi, Grab, xe công nghệ lái xe đường dài. Nhân viên văn phòng ngồi nhiều.",
      "faq": [
        {
          "question": "Sản phẩm này phù hợp với xe nào?",
          "answer": "Universal fit - phù hợp với mọi loại xe từ sedan đến SUV"
        },
        {
          "question": "Bảo hành bao lâu?",
          "answer": "12 tháng đổi mới nếu lỗi nhà sản xuất"
        }
      ],
      "specifications": {
        "Chất liệu": "Lưới 3D thoáng khí",
        "Kích thước": "43x45cm",
        "Trọng lượng": "500g",
        "Màu sắc": "Đen, Xám"
      },
      "shopee_url": "https://shopee.vn/product/123456/789",
      "tiktok_url": "https://www.tiktok.com/@lifxy.vn/video/123456"
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "message": "Successfully updated 1 products",
  "updatedCount": 1,
  "totalRequested": 1,
  "errors": []
}
```

### Example cURL

```bash
curl -X POST https://lifxy-chatbot-ai.onrender.com/api/admin/products/bulk-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "updates": [
      {
        "haravan_id": 1063058069,
        "usp": "✓ Giảm 90% rủi ro tai nạn\n✓ Bảo hiểm 100 triệu/người/vụ\n✓ Thanh toán online nhanh 30s",
        "target_audience": "Chủ xe ô tô dưới 6 chỗ cần gia hạn bảo hiểm",
        "faq": [
          {"question": "Mua online có hợp pháp không?", "answer": "Có, bảo hiểm online đã được Bộ Tài chính cho phép"},
          {"question": "Nhận giấy ở đâu?", "answer": "Ship tận nhà trong 24h hoặc nhận file PDF ngay"}
        ],
        "specifications": {
          "Loại xe": "Ô tô dưới 6 chỗ",
          "Thời hạn": "12 tháng",
          "Số tiền bảo hiểm": "100.000.000 VNĐ/người/vụ"
        },
        "shopee_url": null,
        "tiktok_url": null
      }
    ]
  }'
```

---

## 📌 Update Single Product

### Endpoint
```
PUT /api/admin/products/:haravan_id
```

### Description
Update single product information

### Request Body

```json
{
  "usp": "Product USP here",
  "target_audience": "Target audience description",
  "faq": [...],
  "specifications": {...},
  "shopee_url": "https://...",
  "tiktok_url": "https://..."
}
```

### Example

```bash
curl -X PUT https://lifxy-chatbot-ai.onrender.com/api/admin/products/1063058069 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "usp": "✓ New USP 1\n✓ New USP 2\n✓ New USP 3",
    "target_audience": "Updated target audience"
  }'
```

---

## 📊 Get Statistics

### Endpoint
```
GET /api/admin/stats
```

### Response
```json
{
  "products": {
    "total": 101
  },
  "cache": {
    "keys": 1,
    "ksize": 0,
    "vsize": 0
  },
  "timestamp": "2025-12-31T10:00:00.000Z"
}
```

---

## 🔄 Sync Products from Haravan

### Endpoint
```
POST /api/admin/sync-products
```

### Description
Fetch products from Haravan and sync to database

### Response
```json
{
  "success": true,
  "message": "Successfully synced 101 products",
  "count": 101,
  "verified": 101
}
```

---

## 💡 Tips for Data Entry

### USP (3 Unique Selling Points)
```
✓ Điểm mạnh 1: Cụ thể, đo lường được
✓ Điểm mạnh 2: So sánh với đối thủ
✓ Điểm mạnh 3: Giá trị cảm xúc
```

### Target Audience
```
Mô tả chi tiết: Nghề nghiệp, tình trạng, nhu cầu cụ thể
Ví dụ: "Tài xế Grab/Taxi lái xe 8-12h/ngày, thường xuyên đau lưng"
```

### FAQ
```json
[
  {"question": "Câu hỏi thường gặp 1", "answer": "Trả lời ngắn gọn"},
  {"question": "Câu hỏi về size/lắp đặt", "answer": "Hướng dẫn cụ thể"}
]
```

### Specifications
```json
{
  "Chất liệu": "Memory Foam + Lưới 3D",
  "Kích thước": "45x40x10cm",
  "Trọng lượng": "800g",
  "Màu sắc": "Đen, Xám, Be"
}
```

---

## 🎯 Workflow

1. **Sync products** từ Haravan về database
2. **Export** danh sách sản phẩm cần update
3. **Điền thông tin** USP, FAQ, Target Audience vào Excel/CSV
4. **Convert** sang JSON format
5. **Bulk update** qua API
6. **Test** chatbot với các câu hỏi thực tế

---

## 🚨 Error Handling

### Product Not Found
```json
{
  "success": true,
  "updatedCount": 0,
  "errors": [
    {"haravan_id": 999999, "error": "Product not found"}
  ]
}
```

### Invalid Data
```json
{
  "error": "Invalid request",
  "message": "updates array is required and must not be empty"
}
```

### Unauthorized
```json
{
  "error": "Unauthorized"
}
```
