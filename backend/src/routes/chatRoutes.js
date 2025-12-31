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
 * POST /api/chat/message
 * RAG-enhanced chat endpoint
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

    // Step 1: Extract meaningful keywords from user message
    const keywords = extractKeywords(message);
    console.log('🔍 Extracted keywords:', keywords);

    // Step 2: Search for relevant products (Retrieval)
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

    // Step 3: Build RAG prompt with retrieved products
    const { systemPrompt, hasProducts } = buildRAGPrompt(message, relevantProducts);
    
    console.log('🤖 RAG Context built:');
    console.log('- Has products:', hasProducts);
    console.log('- Product count:', relevantProducts.length);

    // Step 4: Generate AI response with context
    const botResponse = await generateChatResponse(message, systemPrompt);

    // Step 5: Prepare referenced products
    const referencedProducts = relevantProducts.map(p => ({
      id: p.id,
      haravan_id: p.haravan_id,
      title: p.title,
      price: p.price,
      image_url: p.image_url,
      handle: p.handle,
    }));

    // Step 6: Save to database
    await saveChatMessage(sessionId, message, botResponse, referencedProducts);

    // Step 7: Return response with metadata
    return res.json({
      response: botResponse,
      referencedProducts,
      sessionId,
      metadata: {
        productsFound: relevantProducts.length,
        keywords: keywords,
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
