# Hướng dẫn đồng bộ sản phẩm

## Tại sao cần sync thủ công?

Auto-sync khi khởi động server đã được **TẮT mặc định** để tránh timeout khi deploy trên Render.com (free tier có giới hạn 15 phút deploy time).

Với logic pagination mới, việc sync toàn bộ sản phẩm có thể mất nhiều thời gian nếu cửa hàng có hàng trăm/nghìn sản phẩm.

## Cách đồng bộ sản phẩm

### 1. Sau khi deploy thành công

Gọi API endpoint để trigger sync thủ công:

```bash
curl -X POST https://lifxy-chatbot-api.onrender.com/api/admin/sync-products \
  -H "Authorization: Bearer YOUR_HARAVAN_ACCESS_TOKEN"
```

**Thay thế:**
- `YOUR_HARAVAN_ACCESS_TOKEN` bằng token Haravan thực tế
- URL nếu khác

### 2. Kiểm tra kết quả

```bash
# Kiểm tra số lượng sản phẩm
curl https://lifxy-chatbot-api.onrender.com/api/products

# Kiểm tra stats
curl https://lifxy-chatbot-api.onrender.com/api/admin/stats \
  -H "Authorization: Bearer YOUR_HARAVAN_ACCESS_TOKEN"
```

### 3. Tự động sync (tùy chọn)

Nếu muốn bật auto-sync khi server khởi động, thêm biến môi trường:

```
AUTO_SYNC_PRODUCTS=true
```

**⚠️ Lưu ý:** Chỉ bật nếu:
- Cửa hàng có ít sản phẩm (< 100)
- Hoặc đang dùng Render paid plan (không có giới hạn deploy time)

## Sync định kỳ

Để cập nhật sản phẩm định kỳ, có thể:

1. **Dùng Cron Job trên Render** (nếu có paid plan)
2. **Dùng service bên ngoài** như cron-job.org để gọi API sync
3. **Tích hợp Webhooks** từ Haravan (khuyến nghị - real-time updates)

### Setup Webhooks (khuyến nghị)

Thay vì sync định kỳ, hãy tích hợp Webhooks để cập nhật real-time:

1. Vào Haravan Admin > Settings > Webhooks
2. Tạo webhook mới với:
   - **Topic:** `products/update`, `products/create`, `products/delete`
   - **URL:** `https://lifxy-chatbot-api.onrender.com/api/webhooks/products`
   - **Format:** JSON

Khi sản phẩm thay đổi trên Haravan, chatbot sẽ tự động cập nhật ngay lập tức!

## Troubleshooting

### Lỗi "Not Found"
- Kiểm tra service đã deploy thành công chưa
- Render free tier có thể sleep sau 15 phút không hoạt động

### Lỗi 401 Unauthorized
- Kiểm tra Authorization header có đúng không
- Token Haravan còn hạn không

### Sync lâu quá
- Bình thường với nhiều sản phẩm (250 products ≈ 1-2 phút)
- Haravan có rate limit 4 requests/second
- Với 1000 products có thể mất 5-10 phút

### Chỉ sync được 50 sản phẩm
- Nếu vẫn gặp vấn đề này, kiểm tra logs trên Render
- Code mới đã fix vấn đề này, nên không còn xảy ra nữa
