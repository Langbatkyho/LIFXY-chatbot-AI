import express from 'express';
import {
  saveChatMessage,
  getChatHistory,
  createChatSession,
  searchProductsInDb,
} from '../models/chatModel.js';
import { generateChatResponse } from '../services/geminiService.js';
import { buildRAGPrompt } from '../services/promptService.js';

const router = express.Router();

// Vietnamese stop words to filter out
const VIETNAMESE_STOP_WORDS = new Set([
  'tôi', 'bạn', 'anh', 'chị', 'em', 'của', 'và', 'có', 'được', 'cho', 
  'là', 'trong', 'với', 'để', 'không', 'đã', 'sẽ', 'cần', 'muốn', 'mua',
  'bán', 'giá', 'này', 'đó', 'nào', 'gì', 'như', 'thế', 'các', 'một', 'bó'
]);

/**
 * Extract meaningful keywords from user message
 */
function extractKeywords(message) {
  const keywords = message.match(/[\p{L}\p{N}]{2,}/gu) || [];
  const filtered = keywords.filter(word => !VIETNAMESE_STOP_WORDS.has(word.toLowerCase()));
  return filtered.slice(0, 5); // Max 5 keywords
}

/**
 * Smart search for car insurance based on seat count
 */
function findInsuranceBySeats(message) {
  // Extract number of seats from message
  const seatMatch = message.match(/(\d+)\s*chỗ/i);
  if (!seatMatch) return null;
  
  const seats = parseInt(seatMatch[1]);
  
  // Map seats to insurance category
  if (seats < 6) {
    return 'dưới 6 chỗ';
  } else if (seats >= 6 && seats <= 11) {
    return '6-11 chỗ';
  } else if (seats >= 12 && seats <= 24) {
    return '12-24 chỗ';
  } else if (seats > 24) {
    return 'trên 24 chỗ';
  }
  
  return null;
}

/**
 * POST /api/chat/message
 * RAG-enhanced chat endpoint with conversation history
 */
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId, customerEmail, customerName } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Message and sessionId are required',
      });
    }

    // Create or update session
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await createChatSession(sessionId, customerEmail, customerName, ipAddress);

    // Step 1: Get conversation history for context
    const history = await getChatHistory(sessionId, 5); // Last 5 messages
    console.log(`💬 Loading ${history.length} previous messages for context`);

    // Step 2: Combine current message with history context for keyword extraction
    const contextMessage = history.length > 0
      ? history.map(h => h.user_message).join(' ') + ' ' + message
      : message;

    // Step 3: Extract meaningful keywords from combined context
    const keywords = extractKeywords(contextMessage);
    console.log('🔍 Extracted keywords from context:', keywords);

    // Smart insurance search: detect seat count and add specific keyword
    const insuranceSeats = findInsuranceBySeats(contextMessage);
    if (insuranceSeats) {
      console.log(`🚗 Detected car insurance query for: ${insuranceSeats}`);
      keywords.unshift(insuranceSeats);
    }

    // Step 4: Search for relevant products (Retrieval)
    let relevantProducts = [];
    
    if (keywords.length > 0) {
      // Strategy 1: Try phrase search first (combine keywords)
      if (keywords.length >= 2) {
        const phrase = keywords.slice(0, 3).join(' ');
        relevantProducts = await searchProductsInDb(phrase);
        console.log(`📦 Found ${relevantProducts.length} products for phrase: "${phrase}"`);
      }
      
      // Strategy 2: If no results, try individual keywords
      if (relevantProducts.length === 0) {
        for (const keyword of keywords) {
          relevantProducts = await searchProductsInDb(keyword);
          if (relevantProducts.length > 0) {
            console.log(`📦 Found ${relevantProducts.length} products for keyword: "${keyword}"`);
            break;
          }
        }
      }
    }

    // Step 4.5: If still no products found, reuse products from recent conversation
    if (relevantProducts.length === 0 && history.length > 0) {
      // Get products from most recent chat message
      const recentChat = history[history.length - 1];
      if (recentChat.referenced_products && recentChat.referenced_products.length > 0) {
        console.log(`♻️ Reusing ${recentChat.referenced_products.length} products from conversation history`);
        relevantProducts = recentChat.referenced_products;
      }
    }

    // Step 5: Build RAG prompt with retrieved products and conversation history
    const { systemPrompt, hasProducts } = buildRAGPrompt(message, relevantProducts, history);
    
    console.log('🤖 RAG Context built:');
    console.log('- Has products:', hasProducts);
    console.log('- Product count:', relevantProducts.length);
    console.log('- History messages:', history.length);

    // Step 6: Generate AI response with context
    const botResponse = await generateChatResponse(message, systemPrompt);

    // Step 7: Prepare referenced products
    // Step 7: Prepare referenced products
    const referencedProducts = relevantProducts.map(p => ({
      id: p.id,
      haravan_id: p.haravan_id,
      title: p.title,
      price: p.price,
      image_url: p.image_url,
      handle: p.handle,
    }));

    // Step 8: Save to database
    await saveChatMessage(sessionId, message, botResponse, referencedProducts);

    // Step 9: Return response with metadata
    return res.json({
      response: botResponse,
      referencedProducts,
      sessionId,
      metadata: {
        productsFound: relevantProducts.length,
        keywords: keywords,
        historyCount: history.length,
      },
    });
  } catch (error) {
    console.error('❌ Chat error:', error);
    return res.status(500).json({
      error: 'Failed to process message',
      details: error.message,
    });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;

    const history = await getChatHistory(sessionId, parseInt(limit));

    return res.json({
      sessionId,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    return res.status(500).json({
      error: 'Failed to get chat history',
      details: error.message,
    });
  }
});

export default router;
