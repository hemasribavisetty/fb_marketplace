console.log("💬 Messenger Monitor Active");

let GEMINI_API_KEY = "";
let USER_PERSONA = "";
let repliedConversations = new Set();
let isMonitoring = false;
let checkInterval = null;
const CHECK_INTERVAL = 10000; // Check every 10 seconds

// Load API key, persona, and replied conversations from storage
chrome.storage.sync.get(['geminiApiKey', 'userPersona', 'repliedConversations'], (result) => {
  if (result.geminiApiKey) {
    GEMINI_API_KEY = result.geminiApiKey;
    console.log("✅ Gemini API key loaded for auto-replies");
  } else {
    console.log("❌ No Gemini API key - auto-replies disabled");
  }
  if (result.userPersona) {
    USER_PERSONA = result.userPersona;
  }
  if (result.repliedConversations) {
    repliedConversations = new Set(result.repliedConversations);
    console.log(`📋 Loaded ${repliedConversations.size} previously replied conversations`);
  }
});

// Save replied conversations to storage
function saveRepliedConversations() {
  chrome.storage.sync.set({ 
    repliedConversations: Array.from(repliedConversations) 
  });
}

// Listen for storage changes (when API key or persona is updated)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.geminiApiKey) {
      GEMINI_API_KEY = changes.geminiApiKey.newValue || "";
      console.log(GEMINI_API_KEY ? "✅ Gemini API key updated" : "❌ Gemini API key removed");
    }
    if (changes.userPersona) {
      USER_PERSONA = changes.userPersona.newValue || "";
      console.log("📝 User persona updated");
    }
  }
});

/**
 * Extract conversation ID from URL or element
 */
function getConversationId() {
  // Try to get from URL
  const urlMatch = window.location.href.match(/\/t\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  
  // Try to get from data attributes
  const conversationElement = document.querySelector('[data-thread-id]');
  if (conversationElement) {
    return conversationElement.getAttribute('data-thread-id');
  }
  
  return null;
}

/**
 * Check conversation list for unread messages from sellers
 */
function checkConversationList() {
  // Look for conversation items in the sidebar
  const conversationItems = document.querySelectorAll('[role="listitem"], [data-testid*="conversation"], a[href*="/t/"]');
  const unreadConversations = [];
  
  for (let item of conversationItems) {
    // Check for unread indicators
    const hasUnread = item.querySelector('[aria-label*="unread"]') ||
                      item.querySelector('[data-testid*="unread"]') ||
                      item.querySelector('.x1n2onr6') || // Common unread indicator class
                      item.getAttribute('aria-label')?.includes('unread');
    
    if (hasUnread) {
      // Try to extract conversation ID
      const href = item.getAttribute('href') || item.querySelector('a')?.getAttribute('href');
      if (href) {
        const match = href.match(/\/t\/(\d+)/);
        if (match) {
          const conversationId = match[1];
          if (!repliedConversations.has(conversationId)) {
            unreadConversations.push(conversationId);
          }
        }
      }
    }
  }
  
  return unreadConversations;
}

/**
 * Check if there are new messages from the seller (not from us) in current conversation
 */
function hasNewSellerMessage() {
  // First check conversation list for unread messages
  const unreadConvs = checkConversationList();
  if (unreadConvs.length > 0) {
    // Open the first unread conversation
    const conversationId = unreadConvs[0];
    const conversationLink = document.querySelector(`a[href*="/t/${conversationId}"]`);
    if (conversationLink) {
      conversationLink.click();
      // Wait for conversation to load, then check for messages
      setTimeout(() => {
        checkCurrentConversation(conversationId);
      }, 2000);
      return true;
    }
  }
  
  // Check current conversation
  const conversationId = getConversationId();
  if (conversationId) {
    return checkCurrentConversation(conversationId);
  }
  
  return false;
}

/**
 * Check current conversation for new seller messages
 */
function checkCurrentConversation(conversationId) {
  if (!conversationId) {
    conversationId = getConversationId();
  }
  
  if (!conversationId || repliedConversations.has(conversationId)) {
    return false;
  }
  
  // Look for message elements
  const messages = document.querySelectorAll('[data-testid*="message"], [role="row"], [class*="message"]');
  
  if (messages.length === 0) {
    return false;
  }
  
  // Get the last few messages to check
  const recentMessages = Array.from(messages).slice(-5);
  
  for (let msg of recentMessages) {
    // Check if message is from seller (not from us)
    const isFromUs = msg.querySelector('[aria-label*="You"]') || 
                     msg.querySelector('[data-testid*="outgoing"]') ||
                     msg.getAttribute('data-sender-id') === 'true' ||
                     msg.classList.contains('x1n2onr6'); // Common class for our messages
    
    if (!isFromUs) {
      // Check if message text exists and is not empty
      const messageText = msg.innerText || msg.textContent || '';
      if (messageText.trim().length > 0 && messageText.trim().length < 1000) { // Reasonable message length
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract seller's latest message
 */
function extractSellerMessage() {
  const messages = document.querySelectorAll('[data-testid*="message"], [role="row"], [class*="message"]');
  if (messages.length === 0) return null;
  
  // Get the last few messages
  const recentMessages = Array.from(messages).slice(-5);
  
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    // Check if message is from seller (not from us)
    const isFromUs = msg.querySelector('[aria-label*="You"]') || 
                     msg.querySelector('[data-testid*="outgoing"]') ||
                     msg.getAttribute('data-sender-id') === 'true';
    
    if (!isFromUs) {
      const messageText = msg.innerText || msg.textContent || '';
      if (messageText.trim().length > 0 && messageText.trim().length < 1000) {
        return messageText.trim();
      }
    }
  }
  
  return null;
}

/**
 * Send a reply message using Gemini AI
 */
async function sendReply() {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
    console.log("❌ No Gemini API key set, skipping auto-reply");
    return false;
  }
  
  const conversationId = getConversationId();
  if (!conversationId) {
    console.log("❌ Could not determine conversation ID");
    return false;
  }
  
  if (repliedConversations.has(conversationId)) {
    console.log("✅ Already replied to this conversation");
    return false;
  }
  
  // Extract seller's message
  const sellerMessage = extractSellerMessage();
  if (!sellerMessage) {
    console.log("❌ Could not extract seller's message");
    return false;
  }
  
  console.log(`💬 Seller message: "${sellerMessage}"`);
  console.log(`🤖 Generating AI reply for conversation ${conversationId}...`);
  
  // Get conversation history and listing info
  const conversationHistory = await getConversationHistory(conversationId);
  chrome.storage.sync.get(['conversationListings'], (result) => {
    const listings = result.conversationListings || {};
    const listingInfo = listings[conversationId] || null;
    
    // Generate reply using Gemini
    generateReplyMessage(sellerMessage, conversationHistory, listingInfo, GEMINI_API_KEY, USER_PERSONA)
      .then(replyMessage => {
        if (!replyMessage) {
          console.log("❌ Failed to generate reply message");
          return false;
        }
        
        console.log(`✅ Generated reply: "${replyMessage}"`);
        sendGeneratedReply(replyMessage, conversationId, sellerMessage);
      })
      .catch(error => {
        console.error("❌ Error generating reply:", error);
        return false;
      });
  });
}

/**
 * Send the generated reply message
 */
async function sendGeneratedReply(replyMessage, conversationId, sellerMessage) {
  // Save seller's message to history
  await saveToConversationHistory(conversationId, 'seller', sellerMessage);
  
  // Find the message input box
  const waitFor = (selector, timeout = 5000) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el || Date.now() - start > timeout) {
          clearInterval(interval);
          resolve(el);
        }
      }, 200);
    });
  };
  
  // Try multiple selectors for the message input
  let textArea = document.querySelector('div[contenteditable="true"][role="textbox"]') ||
                 document.querySelector('div[contenteditable="true"]') ||
                 document.querySelector('textarea[placeholder*="message"]') ||
                 document.querySelector('textarea');
  
  if (!textArea) {
    textArea = await waitFor('div[contenteditable="true"]');
  }
  
  if (textArea) {
    textArea.focus();
    
    // For contenteditable divs
    if (textArea.contentEditable === 'true') {
      textArea.innerText = replyMessage;
      textArea.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // For textareas
      textArea.value = replyMessage;
      textArea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Wait a bit then send
    setTimeout(() => {
      // Find and click send button
      const sendButton = document.querySelector('[aria-label*="Send"]') ||
                        document.querySelector('[aria-label*="send"]') ||
                        document.querySelector('div[role="button"][aria-label*="Send"]') ||
                        document.querySelector('button[type="submit"]');
      
      if (sendButton) {
        sendButton.click();
        console.log("✅ AI-generated reply sent!");
        
        // Save our reply to history
        saveToConversationHistory(conversationId, 'user', replyMessage);
        
        // Mark conversation as replied
        repliedConversations.add(conversationId);
        saveRepliedConversations();
      } else {
        // Try pressing Enter as fallback
        textArea.dispatchEvent(new KeyboardEvent('keydown', { 
          key: 'Enter', 
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true 
        }));
        console.log("✅ AI-generated reply sent (via Enter key)!");
        
        saveToConversationHistory(conversationId, 'user', replyMessage);
        repliedConversations.add(conversationId);
        saveRepliedConversations();
      }
    }, 500);
  } else {
    console.log("❌ Could not find message input box");
    return false;
  }
}

/**
 * Monitor for new messages
 */
function startMonitoring() {
  if (isMonitoring) {
    return;
  }
  
  isMonitoring = true;
  console.log("👀 Starting message monitoring...");
  
  // Check immediately
  checkForNewMessages();
  
  // Then check periodically
  checkInterval = setInterval(() => {
    checkForNewMessages();
  }, CHECK_INTERVAL);
}

function stopMonitoring() {
  if (!isMonitoring) {
    return;
  }
  
  isMonitoring = false;
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  console.log("🛑 Stopped message monitoring");
}

function checkForNewMessages() {
  // Only check if we're on facebook.com/messages
  if (!window.location.href.includes('facebook.com/messages') && 
      !window.location.href.includes('facebook.com') && 
      !window.location.href.includes('messenger.com')) {
    return;
  }
  
  if (hasNewSellerMessage()) {
    console.log("📨 New seller message detected!");
    const conversationId = getConversationId();
    if (conversationId && !repliedConversations.has(conversationId)) {
      setTimeout(() => {
        sendReply();
      }, 3000); // Wait 3 seconds before replying to ensure conversation is loaded
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startMonitoring') {
    startMonitoring();
    sendResponse({ success: true });
  } else if (request.action === 'stopMonitoring') {
    stopMonitoring();
    sendResponse({ success: true });
  }
  return true;
});

// Auto-start monitoring when page loads
if (window.location.href.includes('facebook.com/messages') || 
    window.location.href.includes('facebook.com') ||
    window.location.href.includes('messenger.com')) {
  setTimeout(() => {
    startMonitoring();
  }, 3000); // Wait 3 seconds for page to load
}

// Also monitor for DOM changes (new messages appearing)
const observer = new MutationObserver(() => {
  if (isMonitoring) {
    checkForNewMessages();
  }
});

// Start observing when DOM is ready
if (document.body) {
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  });
}

