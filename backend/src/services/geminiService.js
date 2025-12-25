import axios from 'axios';
import config from '../config/index.js';

const GEMINI_BASE = config.gemini.apiUrl; // e.g. https://generativelanguage.googleapis.com/v1
const MODEL = config.gemini.model;

async function callGemini(prompt, options = {}) {
  const url = `${GEMINI_BASE}/models/${MODEL}:generateText?key=${config.gemini.apiKey}`;

  const body = {
    prompt: prompt,
    temperature: options.temperature ?? config.gemini.temperature,
    maxOutputTokens: options.maxOutputTokens ?? config.gemini.maxTokens,
  };

  try {
    const resp = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    if (resp.data?.candidates?.length) {
      return resp.data.candidates.map(c => c.content).join('\n');
    }

    if (resp.data?.output?.[0]?.content?.[0]?.text) {
      return resp.data.output[0].content[0].text;
    }

    if (resp.data?.text) {
      return resp.data.text;
    }

    return JSON.stringify(resp.data);
  } catch (err) {
    console.error('Gemini REST error:', err?.response?.data || err.message);
    throw err;
  }
}

export const generateChatResponse = async (userMessage, productContext = '') => {
  const systemPrompt = `You are a helpful and friendly customer service chatbot for CarMate - an automotive e-commerce website.\n\n${productContext ? `Here are the relevant products available:\n${productContext}\n` : ''}\nGuidelines:\n- Be professional but friendly and conversational\n- Ask clarifying questions to understand customer needs\n- Recommend relevant products based on their requirements\n- Provide product information accurately\n- If you mention a product, include its name and approximate price\n- Suggest similar products or complementary items\n- Be honest if we don't have what they're looking for\n- Encourage them to browse the website for more options\n- Respond in the same language as the customer\n\nImportant: Always prioritize being helpful and providing accurate product information.`;

  const prompt = `${systemPrompt}\n\nCustomer message: ${userMessage}`;

  const text = await callGemini(prompt, {
    temperature: config.gemini.temperature,
    maxOutputTokens: config.gemini.maxTokens,
  });

  return text;
};

export const generateRecommendations = async (userPreferences, products = []) => {
  const productInfo = products
    .slice(0, 10)
    .map(p => `- ${p.title}: ${p.description?.substring(0, 100) || ''}`)
    .join('\n');

  const prompt = `Based on the user's preferences: "${userPreferences}"\n\nAvailable products:\n${productInfo}\n\nRecommend 2-3 most suitable products with brief explanations why they match the user's needs. Format the response as a readable list.`;

  const text = await callGemini(prompt, {
    temperature: config.gemini.temperature,
    maxOutputTokens: config.gemini.maxTokens,
  });

  return text;
};

export default {
  generateChatResponse,
  generateRecommendations,
};
