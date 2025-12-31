/**
 * Master Prompt System for RAG-based product consultation
 */

const MASTER_SYSTEM_PROMPT = `HƯỚNG DẪN HỆ THỐNG: Bạn là trợ lý bán hàng chuyên nghiệp và thân thiện cho Lifxy.vn - chuyên cung cấp phụ kiện ô tô chất lượng cao.

QUY TẮC TƯ VẤN BẮT BUỘC:

1. SỬ DỤNG DỮ LIỆU CHÍNH XÁC:
   - Chỉ sử dụng thông tin từ phần [DỮ LIỆU SẢN PHẨM] được cung cấp bên dưới
   - KHÔNG tự bịa ra thông số, giá cả, hoặc tính năng không có trong dữ liệu
   - Nếu không có thông tin, hãy thừa nhận và đề xuất giải pháp thay thế

2. QUY TRÌNH TƯ VẤN 4 BƯỚC:
   
   Bước 1 - THĂM HỎI: 
   - Hỏi về nhu cầu cụ thể, tình trạng hiện tại
   - Ví dụ: "Anh/chị đang gặp vấn đề gì với xe ạ?"
   
   Bước 2 - GỢI Ý GIẢI PHÁP:
   - Đề xuất 2-3 sản phẩm phù hợp nhất từ danh sách tìm được
   - Giải thích TẠI SAO sản phẩm này phù hợp (dựa vào USP)
   
   Bước 3 - TƯ VẤN CHI TIẾT:
   - Hướng dẫn chọn size/thông số phù hợp
   - Trả lời FAQ nếu khách hỏi
   
   Bước 4 - CHỐT ĐƠN ĐA KÊNH:
   - Cung cấp link mua hàng (Haravan + Shopee/TikTok nếu có)
   - Format: "🔗 Đặt hàng ngay: [Link website] | Shopee: [link] | TikTok: [link]"
   - Gợi ý: "Anh/chị có thể đặt qua website hoặc Shopee để được freeship ạ"
   - BẮT BUỘC: Phải đưa link trong mỗi lần tư vấn sản phẩm

3. XỬ LÝ KHI KHÔNG TÌM THẤY:
   - Nếu không có sản phẩm phù hợp trong [DỮ LIỆU SẢN PHẨM]:
   - Nói: "Em chưa tìm thấy sản phẩm phù hợp trong kho hiển thị. Anh/chị vui lòng để lại SĐT, bộ phận kỹ thuật sẽ kiểm tra kho và gọi lại trong 30 phút ạ!"

4. PHONG CÁCH GIAO TIẾP:
   - Xưng hô: "Anh/chị" và "em"
   - Ngắn gọn, dễ hiểu, không dùng thuật ngữ khó
   - Emoji phù hợp: 🚗 ✅ 💯 🎁
   - Luôn kết thúc bằng câu hỏi mở để duy trì hội thoại

---

[DỮ LIỆU SẢN PHẨM TRUY XUẤT ĐƯỢC]:
{{PRODUCT_DATA}}

---

HÃY BẮT ĐẦU TƯ VẤN DỰA TRÊN DỮ LIỆU TRÊN!`;

/**
 * Format product data for RAG context
 */
export function formatProductContext(products) {
  if (!products || products.length === 0) {
    return "Không tìm thấy sản phẩm phù hợp trong cơ sở dữ liệu.";
  }

  return products.map((product, index) => {
    let context = `\n【SẢN PHẨM ${index + 1}】\n`;
    context += `📌 Tên: ${product.title}\n`;
    context += `💰 Giá: ${Number(product.price).toLocaleString('vi-VN')}đ\n`;
    
    if (product.usp) {
      context += `\n⭐ 3 ĐIỂM MẠNH:\n${product.usp}\n`;
    }
    
    if (product.target_audience) {
      context += `\n👤 AI NÊN DÙNG:\n${product.target_audience}\n`;
    }
    
    if (product.faq) {
      context += `\n❓ FAQ:\n`;
      const faqData = typeof product.faq === 'string' ? JSON.parse(product.faq) : product.faq;
      if (Array.isArray(faqData)) {
        faqData.forEach(item => {
          context += `Q: ${item.question}\nA: ${item.answer}\n\n`;
        });
      } else if (typeof faqData === 'object') {
        Object.entries(faqData).forEach(([q, a]) => {
          context += `Q: ${q}\nA: ${a}\n\n`;
        });
      }
    }
    
    if (product.specifications) {
      context += `\n📏 THÔNG SỐ:\n`;
      const specs = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications;
      if (typeof specs === 'object') {
        Object.entries(specs).forEach(([key, value]) => {
          context += `- ${key}: ${value}\n`;
        });
      }
    }
    
    context += '\n🔗 LINK MUA HÀNG - BẮT BUỘC ĐƯA CHO KHÁCH:\n';
    if (product.handle) {
      context += `- Website: https://lifxy.vn/products/${product.handle}\n`;
    }
    if (product.shopee_url) {
      context += `- Shopee: ${product.shopee_url}\n`;
    }
    if (product.tiktok_url) {
      context += `- TikTok Shop: ${product.tiktok_url}\n`;
    }
    if (!product.handle && !product.shopee_url && !product.tiktok_url) {
      context += '- Liên hệ: 0123456789 (hotline)\n';
    }
    
    context += `\n${'='.repeat(60)}\n`;
    
    return context;
  }).join('\n');
}

/**
 * Build complete prompt with RAG context and conversation history
 */
export function buildRAGPrompt(userMessage, relevantProducts, conversationHistory = []) {
  const productContext = formatProductContext(relevantProducts);
  
  // Build conversation history context
  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyContext = '\n\n[LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ]:\n';
    conversationHistory.forEach((msg, idx) => {
      historyContext += `${idx + 1}. Khách: ${msg.user_message}\n`;
      historyContext += `   Em: ${msg.bot_response}\n\n`;
    });
    historyContext += '[KẾT THÚC LỊCH SỬ]\n';
    historyContext += '\n⚠️ LƯU Ý: Hãy dựa vào lịch sử hội thoại trên để trả lời câu hỏi tiếp theo của khách một cách mạch lạc và liên tục. Không hỏi lại những gì khách đã trả lời.\n';
  }
  
  const systemPrompt = MASTER_SYSTEM_PROMPT
    .replace('{{PRODUCT_DATA}}', productContext)
    .replace('HÃY BẮT ĐẦU TƯ VẤN DỰA TRÊN DỮ LIỆU TRÊN!', historyContext + '\nHÃY BẮT ĐẦU TƯ VẤN DỰA TRÊN DỮ LIỆU VÀ LỊCH SỬ TRÊN!');
  
  return {
    systemPrompt,
    productContext,
    hasProducts: relevantProducts && relevantProducts.length > 0,
    hasHistory: conversationHistory && conversationHistory.length > 0
  };
}

export { MASTER_SYSTEM_PROMPT };
