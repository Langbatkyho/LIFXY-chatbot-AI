import express from 'express';
import {
  saveChatMessage,
  getChatHistory,
  createChatSession,
} from '../models/chatModel.js';
import { generateChatResponse } from '../services/geminiService.js';
import { searchProductsInDb } from '../models/chatModel.js';

const router = express.Router();

/**
 * POST /api/chat/message
 * Send chat message and get response from Gemini AI
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

    // Search for relevant products
    // Extract Vietnamese and English keywords (3+ characters)
    const keywords = message.match(/[\p{L}\p{N}]{3,}/gu) || [];
    let productContext = '';
    let referencedProducts = [];

    // Filter out common Vietnamese stop words
    const stopWords = ['tôi', 'tớ', 'mình', 'cần', 'muốn', 'mua', 'bán', 'có', 'được', 'này', 'đó', 'thế', 'nào', 'gì', 'cho'];
    const meaningfulKeywords = keywords.filter(k => !stopWords.includes(k.toLowerCase()));

    if (meaningfulKeywords.length > 0) {
      // Try searching with multiple strategies
      let searchResults = [];
      
      // Strategy 1: Try full phrase with meaningful keywords (combine first 2-3 words)
      if (meaningfulKeywords.length >= 2) {
        const phrase = meaningfulKeywords.slice(0, 3).join(' ');
        searchResults = await searchProductsInDb(phrase);
      }
      
      // Strategy 2: If no results, try individual meaningful keywords
      if (searchResults.length === 0) {
        for (const keyword of meaningfulKeywords.slice(0, 5)) {
          searchResults = await searchProductsInDb(keyword);
          if (searchResults.length > 0) break;
        }
      }
      
      if (searchResults.length > 0) {
        referencedProducts = searchResults.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
        }));

        productContext = searchResults
          .map(p => `- ${p.title}: ${p.description?.substring(0, 80)}... (${p.price}đ)`)
          .join('\n');
      }
    }

    // Generate response from Gemini
    const botResponse = await generateChatResponse(message, productContext);

    // Save to database
    await saveChatMessage(sessionId, message, botResponse, referencedProducts);

    return res.json({
      response: botResponse,
      referencedProducts,
      sessionId,
    });
  } catch (error) {
    console.error('Chat error:', error);
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
