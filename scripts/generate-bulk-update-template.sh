#!/bin/bash

# Script: Generate bulk update template with all products
# Usage: ./scripts/generate-bulk-update-template.sh > bulk-update-all-products.json

API_URL="https://lifxy-chatbot-ai.onrender.com"

echo '{'
echo '  "updates": ['

# Get all products and format as JSON template
curl -s "${API_URL}/api/products?limit=200" | jq -r '
.products[] | 
"    {
      \"haravan_id\": \(.haravan_id),
      \"usp\": \"✓ [ĐIỂM NỔI BẬT 1]\\n✓ [ĐIỂM NỔI BẬT 2]\\n✓ [ĐIỂM NỔI BẬT 3]\",
      \"target_audience\": \"[Mô tả khách hàng mục tiêu: độ tuổi, nghề nghiệp, nhu cầu cụ thể]\",
      \"faq\": [
        {
          \"question\": \"[Câu hỏi thường gặp 1]?\",
          \"answer\": \"[Câu trả lời chi tiết]\"
        },
        {
          \"question\": \"[Câu hỏi thường gặp 2]?\",
          \"answer\": \"[Câu trả lời chi tiết]\"
        }
      ],
      \"specifications\": {
        \"Xuất xứ\": \"[Nước sản xuất]\",
        \"Chất liệu\": \"[Vật liệu chính]\",
        \"Kích thước\": \"[Thông số kích thước]\"
      },
      \"shopee_url\": null,
      \"tiktok_url\": null
    },"'

echo '  ]'
echo '}'
