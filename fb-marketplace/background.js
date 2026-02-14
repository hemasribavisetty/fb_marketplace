console.log("🚀 Background Service Worker Started");

// Configuration
const SEARCH_INTERVAL = 30000; // Check every 30 seconds
const MAX_TABS = 1; // Maximum number of background tabs

let activeTabId = null;
let isRunning = false;
let searchInterval = null;
let currentKeyword = "bike"; // Default keyword
let messagesSentCount = 0; // Track how many messages have been sent
let MAX_MESSAGES = 3; // Maximum number of messages to send (configurable)

/**
 * Gets the marketplace search URL for a given keyword
 */
function getMarketplaceUrl(keyword) {
  if (!keyword || keyword.trim() === "") {
    return "https://www.facebook.com/marketplace";
  }
  // Facebook Marketplace search URL format
  return `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(keyword.trim())}`;
}

/**
 * Creates a background tab for Facebook Marketplace
 */
async function createBackgroundTab(keyword) {
  try {
    const marketplaceUrl = getMarketplaceUrl(keyword);
    
    // Check if we already have an active tab
    if (activeTabId) {
      try {
        const tab = await chrome.tabs.get(activeTabId);
        if (tab && !tab.url.includes('marketplace')) {
          // Tab exists but is not on marketplace, update it
          await chrome.tabs.update(activeTabId, { url: marketplaceUrl });
          return activeTabId;
        } else if (tab && tab.url !== marketplaceUrl) {
          // Tab is on marketplace but different search, update it
          await chrome.tabs.update(activeTabId, { url: marketplaceUrl });
          return activeTabId;
        } else if (tab) {
          // Tab is already on the correct marketplace URL
          return activeTabId;
        }
      } catch (e) {
        // Tab doesn't exist anymore, reset
        activeTabId = null;
      }
    }

    // Create new background tab
    const tab = await chrome.tabs.create({
      url: marketplaceUrl,
      active: false // Open in background
    });

    activeTabId = tab.id;
    console.log(`✅ Created background tab: ${tab.id} for search: "${keyword}"`);

    // Wait for tab to load, then inject script
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === activeTabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        injectContentScript(tabId);
      }
    });

    return tab.id;
  } catch (error) {
    console.error("❌ Error creating background tab:", error);
    return null;
  }
}

/**
 * Injects the content script into the tab
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    console.log(`✅ Content script injected into tab ${tabId}`);
  } catch (error) {
    console.error("❌ Error injecting content script:", error);
  }
}

/**
 * Starts the background search process
 */
async function startSearch(keyword) {
  if (isRunning) {
    console.log("⚠️ Search is already running");
    return;
  }

  if (!keyword || keyword.trim() === "") {
    console.error("❌ No search keyword provided");
    return;
  }

  currentKeyword = keyword.trim();
  isRunning = true;
  messagesSentCount = 0; // Reset message count when starting new search
  
  // Load maxMessages from storage
  chrome.storage.sync.get(['maxMessages'], (result) => {
    if (result.maxMessages) {
      MAX_MESSAGES = parseInt(result.maxMessages) || 3;
    }
    console.log(`🔍 Starting background search for: "${currentKeyword}"`);
    console.log(`📊 Will stop after sending ${MAX_MESSAGES} messages`);
  });

  // Save keyword to storage
  chrome.storage.sync.set({ searchKeyword: currentKeyword });

  // Create initial marketplace tab
  await createBackgroundTab(currentKeyword);

  // Note: Messenger monitoring will work on facebook.com/messages automatically
  // No need to create a separate messenger.com tab

  // Set up periodic refresh (only if we haven't reached max messages)
  searchInterval = setInterval(async () => {
    // Stop refreshing if we've reached the maximum number of messages
    if (messagesSentCount >= MAX_MESSAGES) {
      console.log(`✅ Reached maximum of ${MAX_MESSAGES} messages. Stopping refresh.`);
      stopSearch();
      return;
    }
    
    if (activeTabId) {
      try {
        // Refresh the marketplace page
        await chrome.tabs.reload(activeTabId);
        console.log(`🔄 Refreshed marketplace page for: "${currentKeyword}" (${messagesSentCount}/${MAX_MESSAGES} messages sent)`);
      } catch (error) {
        console.error("❌ Error refreshing tab:", error);
        // Tab might be closed, create a new one
        activeTabId = null;
        await createBackgroundTab(currentKeyword);
      }
    } else {
      await createBackgroundTab(currentKeyword);
    }
  }, SEARCH_INTERVAL);
}

/**
 * Stops the background search process
 */
function stopSearch() {
  if (!isRunning) {
    console.log("⚠️ Search is not running");
    return;
  }

  isRunning = false;
  
  if (searchInterval) {
    clearInterval(searchInterval);
    searchInterval = null;
  }

  // Close the background tab
  if (activeTabId) {
    chrome.tabs.remove(activeTabId).catch(() => {
      // Tab might already be closed
    });
    activeTabId = null;
  }

  console.log("🛑 Stopped background search");
}

/**
 * Listen for messages from popup or content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start') {
    // Save all settings to storage
    const settingsToSave = {};
    if (request.minPrice !== undefined || request.maxPrice !== undefined) {
      settingsToSave.minPrice = request.minPrice;
      settingsToSave.maxPrice = request.maxPrice;
    }
    if (request.maxMessages !== undefined) {
      settingsToSave.maxMessages = request.maxMessages;
      MAX_MESSAGES = parseInt(request.maxMessages) || 3;
    }
    if (request.geminiApiKey !== undefined) {
      settingsToSave.geminiApiKey = request.geminiApiKey;
    }
    if (request.userPersona !== undefined) {
      settingsToSave.userPersona = request.userPersona;
    }
    if (Object.keys(settingsToSave).length > 0) {
      chrome.storage.sync.set(settingsToSave);
    }
    startSearch(request.keyword || currentKeyword);
    sendResponse({ success: true, message: 'Search started' });
  } else if (request.action === 'stop') {
    stopSearch();
    sendResponse({ success: true, message: 'Search stopped' });
  } else if (request.action === 'messageSent') {
    // Update message count
    messagesSentCount = request.count || 0;
    const maxMessages = request.maxMessages || MAX_MESSAGES;
    console.log(`📊 Message count updated: ${messagesSentCount}/${maxMessages}`);
    
    // Stop search if we've reached the maximum
    if (messagesSentCount >= maxMessages) {
      console.log(`✅ Successfully sent ${maxMessages} messages! Stopping search automatically.`);
      stopSearch();
    }
    
    sendResponse({ success: true, messagesSent: messagesSentCount, maxMessages: maxMessages });
  } else if (request.action === 'status') {
    sendResponse({ 
      success: true, 
      isRunning: isRunning,
      activeTabId: activeTabId,
      keyword: currentKeyword,
      messagesSent: messagesSentCount,
      maxMessages: MAX_MESSAGES
    });
  } else if (request.action === 'found') {
    console.log("🎉 Item found! Tab ID:", sender.tab?.id);
    // Optionally handle when an item is found
  }
  
  return true; // Keep message channel open for async response
});

// Load saved keyword on startup
chrome.storage.sync.get(['searchKeyword'], (result) => {
  if (result.searchKeyword) {
    currentKeyword = result.searchKeyword;
  }
});

/**
 * Clean up when extension is disabled/uninstalled
 */
chrome.runtime.onSuspend.addListener(() => {
  stopSearch();
});

/**
 * Handle tab closure
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
    if (isRunning) {
      // Recreate tab if search is still running
      setTimeout(() => createBackgroundTab(currentKeyword), 2000);
    }
  }
});

// Auto-start on extension load (optional - you can remove this if you want manual start)
// Uncomment the line below if you want it to start automatically
// startSearch();

