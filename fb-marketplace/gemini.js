/**
 * Gemini API Integration
 * Handles all AI-powered message generation
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Generate a message using Gemini API
 */
async function generateMessage(prompt, apiKey) {
  if (!apiKey || apiKey.trim() === "") {
    console.error("❌ No Gemini API key provided");
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Gemini API error:", errorData);
      return null;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const generatedText = data.candidates[0].content.parts[0].text.trim();
      console.log("✅ Generated message:", generatedText);
      return generatedText;
    }
    
    console.error("❌ Unexpected response format from Gemini API");
    return null;
  } catch (error) {
    console.error("❌ Error calling Gemini API:", error);
    return null;
  }
}

/**
 * Generate initial message for a listing
 */
async function generateInitialMessage(listingInfo, apiKey, userPersona) {
  const { title, price, description } = listingInfo;
  
  const personaText = userPersona ? `\n\nYour communication style: ${userPersona}` : '';
  
  const prompt = `You are helping someone message a seller on Facebook Marketplace. Generate a friendly, natural, and engaging first message to inquire about a listing.

Listing Details:
- Title: ${title || 'Not specified'}
- Price: ${price ? '$' + price : 'Not specified'}
- Description: ${description || 'No description available'}

Requirements:
- Keep it short (1-2 sentences max)
- Be friendly and polite
- Show genuine interest
- Ask if the item is still available
- Sound natural, not robotic
- Don't be too pushy or salesy${personaText}

Generate ONLY the message text, nothing else:`;

  return await generateMessage(prompt, apiKey);
}

/**
 * Generate a reply message based on conversation context
 */
async function generateReplyMessage(sellerMessage, conversationHistory, listingInfo, apiKey, userPersona) {
  const personaText = userPersona ? `\n\nYour communication style: ${userPersona}` : '';
  
  const historyText = conversationHistory.length > 0 
    ? `\n\nPrevious conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.text}`).join('\n')}`
    : '';
  
  const listingText = listingInfo 
    ? `\n\nOriginal listing: ${listingInfo.title}${listingInfo.price ? ' - $' + listingInfo.price : ''}`
    : '';
  
  const prompt = `You are helping someone respond to a seller on Facebook Marketplace. The seller just sent this message:

Seller: "${sellerMessage}"${historyText}${listingText}

Requirements:
- Respond naturally and contextually to what the seller said
- Be friendly and polite
- Keep it concise (1-3 sentences)
- If they asked a question, answer it
- If they're confirming availability, express interest
- If they're negotiating, be reasonable
- Sound like a real person, not a bot${personaText}

Generate ONLY the reply message text, nothing else:`;

  return await generateMessage(prompt, apiKey);
}

/**
 * Get conversation history from storage
 */
async function getConversationHistory(conversationId) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['conversationHistory'], (result) => {
      const allHistory = result.conversationHistory || {};
      resolve(allHistory[conversationId] || []);
    });
  });
}

/**
 * Save message to conversation history
 */
async function saveToConversationHistory(conversationId, role, text) {
  chrome.storage.sync.get(['conversationHistory'], (result) => {
    const allHistory = result.conversationHistory || {};
    if (!allHistory[conversationId]) {
      allHistory[conversationId] = [];
    }
    allHistory[conversationId].push({
      role: role, // 'user' or 'seller'
      text: text,
      timestamp: Date.now()
    });
    // Keep only last 10 messages for context
    if (allHistory[conversationId].length > 10) {
      allHistory[conversationId] = allHistory[conversationId].slice(-10);
    }
    chrome.storage.sync.set({ conversationHistory: allHistory });
  });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateInitialMessage,
    generateReplyMessage,
    getConversationHistory,
    saveToConversationHistory
  };
}

