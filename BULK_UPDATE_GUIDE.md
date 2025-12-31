# Hướng Dẫn Cập Nhật Hàng Loạt Thông Tin Sản Phẩm

## 📋 Tổng quan

Hệ thống RAG chatbot cần thông tin chi tiết về sản phẩm để tư vấn hiệu quả:
- **USP** (Unique Selling Points): 3-5 điểm nổi bật, mỗi dòng bắt đầu với ✓
- **Target Audience**: Khách hàng mục tiêu (độ tuổi, nghề nghiệp, nhu cầu)
- **FAQ**: 2-5 câu hỏi thường gặp + câu trả lời
- **Specifications**: Thông số kỹ thuật (JSON object)
- **Shopee URL**: Link Shopee (nếu có)
- **TikTok URL**: Link TikTok Shop (nếu có)

---

## 🚀 Quy trình 3 bước

### **Bước 1: Tạo file template cho tất cả sản phẩm**

```bash
cd /workspaces/LIFXY-chatbot-AI
./scripts/generate-bulk-update-template.sh > bulk-update-all-products.json
```

File `bulk-update-all-products.json` sẽ có cấu trúc:

```json
{
  "updates": [
    {
      "_comment": "📝 Bảo hiểm Trách nhiệm dân sự bắt buộc dành cho xe ô tô (dưới 6 chỗ ngồi)",
      "haravan_id": 1063058069,
      "usp": "✓ [ĐIỂM NỔI BẬT 1]\n✓ [ĐIỂM NỔI BẬT 2]\n✓ [ĐIỂM NỔI BẬT 3]",
      "target_audience": "[Mô tả khách hàng mục tiêu]",
      "faq": [
        {
          "question": "[Câu hỏi thường gặp 1]?",
          "answer": "[Câu trả lời chi tiết]"
        }
      ],
      "specifications": {
        "Xuất xứ": "[Nước sản xuất]",
        "Chất liệu": "[Vật liệu chính]"
      },
      "shopee_url": null,
      "tiktok_url": null
    }
    // ... 100+ sản phẩm khác
  ]
}
```

---

### **Bước 2: Điền thông tin từng sản phẩm**

Mở file `bulk-update-all-products.json` và điền thông tin:

> **💡 Lưu ý:** Field `_comment` chứa tên sản phẩm để dễ phân biệt, **không được gửi lên API** (API sẽ tự động bỏ qua field này).

#### **2.1. USP - Unique Selling Points**
- 3-5 điểm nổi bật nhất của sản phẩm
- Mỗi dòng bắt đầu với `✓` 
- Ngắt dòng bằng `\n`

**Ví dụ tốt:**
```json
"usp": "✓ Bắt buộc theo Nghị định 03/2021 - Tránh phạt đến 8 triệu\n✓ Bảo hiểm 100 triệu/người/vụ - An tâm trên mọi hành trình\n✓ Thanh toán online nhanh 30s - Nhận file PDF ngay"
```

**Ví dụ xấu:**
```json
"usp": "Sản phẩm tốt, giá rẻ" // ❌ Không cụ thể, không có lợi ích rõ ràng
```

#### **2.2. Target Audience - Khách hàng mục tiêu**
- Mô tả chi tiết ai cần sản phẩm này
- Bao gồm: độ tuổi, nghề nghiệp, tình huống sử dụng

**Ví dụ tốt:**
```json
"target_audience": "Chủ xe ô tô dưới 6 chỗ cần gia hạn bảo hiểm TNDS. Đặc biệt phù hợp với xe gia đình, xe kinh doanh taxi/Grab."
```

**Ví dụ xấu:**
```json
"target_audience": "Mọi người" // ❌ Quá chung chung
```

#### **2.3. FAQ - Câu hỏi thường gặp**
- 2-5 câu hỏi khách hàng hay hỏi
- Câu trả lời phải chi tiết, giải quyết nỗi lo

**Ví dụ tốt:**
```json
"faq": [
  {
    "question": "Mua bảo hiểm online có hợp pháp không?",
    "answer": "Hoàn toàn hợp pháp. Bảo hiểm online đã được Bộ Tài chính cho phép theo Thông tư 04/2021."
  },
  {
    "question": "Nhận giấy chứng nhận ở đâu?",
    "answer": "Ship tận nhà trong 24-48h (miễn phí nội thành) hoặc nhận file PDF qua email ngay sau khi thanh toán."
  }
]
```

#### **2.4. Specifications - Thông số kỹ thuật**
- JSON object với key-value
- Tùy loại sản phẩm mà có thông số khác nhau

**Ví dụ bảo hiểm:**
```json
"specifications": {
  "Loại xe": "Ô tô dưới 6 chỗ (không kinh doanh vận tải)",
  "Thời hạn bảo hiểm": "12 tháng",
  "Số tiền bảo hiểm": "100.000.000 VNĐ/người/vụ",
  "Phạm vi": "Toàn quốc"
}
```

**Ví dụ phụ kiện:**
```json
"specifications": {
  "Xuất xứ": "Nhật Bản",
  "Chất liệu": "Nylon + Spandex",
  "Kích thước": "One Size (có điều chỉnh)",
  "Màu sắc": "Đen, Xanh, Đỏ"
}
```

#### **2.5. Link mua hàng**
```json
"shopee_url": "https://shopee.vn/lifxy-dai-bo-goi",
"tiktok_url": "https://www.tiktok.com/@lifxy.vn/video-dai-bo-goi"
```

Nếu chưa có thì để `null`.

---

### **Bước 3: Gửi lên server**

#### **3.1. Kiểm tra JSON hợp lệ**

```bash
# Kiểm tra syntax JSON
cat bulk-update-all-products.json | jq empty

# Nếu không lỗi → JSON hợp lệ ✓
```

#### **3.2. Upload qua API**

```bash
curl -X POST https://lifxy-chatbot-ai.onrender.com/api/admin/products/bulk-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 478D7C6A4F54369A9B56449701A9884A734F2D0F57EA6E40AAC96EB4CF1104F7" \
  -d @bulk-update-all-products.json
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "updated": 98,
  "failed": 3,
  "errors": [
    {
      "haravan_id": 999999,
      "error": "Product not found"
    }
  ]
}
```

---

## 📝 Tips & Best Practices

### ✅ Nên làm:
- **USP ngắn gọn**: Mỗi điểm 1 dòng, max 15 từ
- **FAQ thực tế**: Lấy từ câu hỏi khách hàng thật
- **Specifications đầy đủ**: Càng chi tiết càng tốt cho AI
- **Test từng batch**: Chia nhỏ 10-20 sản phẩm/lần để dễ debug

### ❌ Tránh:
- USP chung chung: "Sản phẩm chất lượng cao"
- FAQ giả tạo: Không ai hỏi
- Copy-paste nguyên bản: Mỗi sản phẩm phải khác nhau
- Quên escape: Dùng `\n` cho xuống dòng, `\"` cho dấu ngoặc kép

---

## 🔍 Kiểm tra kết quả

### Xem sản phẩm đã update:

```bash
curl -s "https://lifxy-chatbot-ai.onrender.com/api/products/1063058069" | jq '{
  title: .title,
  has_usp: (.usp != null),
  has_faq: (.faq != null),
  faq_count: (.faq | length),
  has_specs: (.specifications != null)
}'
```

### Test chatbot:

1. Mở chatbot trên website
2. Hỏi: "Tôi cần bảo hiểm xe 7 chỗ"
3. Kiểm tra:
   - ✅ AI đề xuất đúng sản phẩm
   - ✅ Giải thích USP rõ ràng
   - ✅ Trả lời FAQ chính xác
   - ✅ Đưa link mua hàng

---

## 🆘 Troubleshooting

### Lỗi: "Product not found"
→ `haravan_id` không tồn tại trong database

**Fix:**
```bash
# Lấy danh sách haravan_id hợp lệ
curl -s "https://lifxy-chatbot-ai.onrender.com/api/products?limit=200" | jq -r '.products[].haravan_id'
```

### Lỗi: "Invalid JSON"
→ Syntax JSON sai (thiếu dấu phẩy, ngoặc)

**Fix:**
```bash
# Dùng jq để validate
cat bulk-update-all-products.json | jq empty
# Nếu lỗi → jq sẽ chỉ ra dòng nào sai
```

### Lỗi: "Authorization failed"
→ Token không đúng

**Fix:** Kiểm tra lại Bearer token trong request

---

## 📚 Tham khảo

- File mẫu: `sample-bulk-update.json`
- API docs: `/workspaces/LIFXY-chatbot-AI/backend/src/routes/adminRoutes.js`
- Master Prompt: `/workspaces/LIFXY-chatbot-AI/backend/src/services/promptService.js`

---

**Chúc anh cập nhật thành công! 🚀**
