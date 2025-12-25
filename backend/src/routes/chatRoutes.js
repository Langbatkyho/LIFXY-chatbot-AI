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
    const keywords = message.match(/\b\w{3,}\b/g) || [];
    let productContext = '';
    let referencedProducts = [];

    if (keywords.length > 0) {
      const searchResults = await searchProductsInDb(keywords[0]);
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
