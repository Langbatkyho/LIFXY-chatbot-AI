import { GoogleGenerativeAI } from '@google-cloud/generative-ai';
import config from '../config/index.js';

const client = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate chat response using Gemini AI
 */
export const generateChatResponse = async (userMessage, productContext = '') => {
  try {
    const model = client.getGenerativeModel({ model: config.gemini.model });

    const systemPrompt = `You are a helpful and friendly customer service chatbot for CarMate - an automotive e-commerce website.
Your role is to help customers find the right products and provide recommendations based on their needs.

${productContext ? `Here are the relevant products available:\n${productContext}\n` : ''}

Guidelines:
- Be professional but friendly and conversational
- Ask clarifying questions to understand customer needs
- Recommend relevant products based on their requirements
- Provide product information accurately
- If you mention a product, include its name and approximate price
- Suggest similar products or complementary items
- Be honest if we don't have what they're looking for
- Encourage them to browse the website for more options
- Respond in the same language as the customer

Important: Always prioritize being helpful and providing accurate product information.`;

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nCustomer message: ${userMessage}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: config.gemini.temperature,
        maxOutputTokens: config.gemini.maxTokens,
      },
    });

    const text = response.response.text();
    return text;
  } catch (error) {
    console.error('Error generating response from Gemini:', error.message);
    throw error;
  }
};

/**
 * Generate product recommendations
 */
export const generateRecommendations = async (userPreferences, products) => {
  try {
    const model = client.getGenerativeModel({ model: config.gemini.model });

    const productInfo = products
      .slice(0, 10)
      .map(p => `- ${p.title}: ${p.description?.substring(0, 100)}...`)
      .join('\n');

    const prompt = `Based on the user's preferences: "${userPreferences}"
    
Available products:
${productInfo}

Recommend 2-3 most suitable products with brief explanations why they match the user's needs.
Format the response as a readable list.`;

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: config.gemini.temperature,
        maxOutputTokens: config.gemini.maxTokens,
      },
    });

    return response.response.text();
  } catch (error) {
    console.error('Error generating recommendations:', error.message);
    throw error;
  }
};

export default {
  generateChatResponse,
  generateRecommendations,
};
