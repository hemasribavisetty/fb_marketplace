// Popup script to control the background search

let isRunning = false;
const searchInput = document.getElementById('searchInput');
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');
const maxMessagesInput = document.getElementById('maxMessages');
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const userPersonaInput = document.getElementById('userPersona');

// Load saved settings
chrome.storage.sync.get(['searchKeyword', 'minPrice', 'maxPrice', 'maxMessages', 'geminiApiKey', 'userPersona'], (result) => {
  if (result.searchKeyword) {
    searchInput.value = result.searchKeyword;
  }
  if (result.minPrice) {
    minPriceInput.value = result.minPrice;
  }
  if (result.maxPrice) {
    maxPriceInput.value = result.maxPrice;
  }
  if (result.maxMessages) {
    maxMessagesInput.value = result.maxMessages;
  }
  if (result.geminiApiKey) {
    geminiApiKeyInput.value = result.geminiApiKey;
  }
  if (result.userPersona) {
    userPersonaInput.value = result.userPersona;
  }
});

// Update UI based on status
function updateUI(status) {
  const statusDiv = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  isRunning = status;
  
  if (status) {
    statusDiv.textContent = 'Status: Running';
    statusDiv.className = 'status running';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    searchInput.disabled = true;
    minPriceInput.disabled = true;
    maxPriceInput.disabled = true;
    maxMessagesInput.disabled = true;
    geminiApiKeyInput.disabled = true;
    userPersonaInput.disabled = true;
  } else {
    statusDiv.textContent = 'Status: Stopped';
    statusDiv.className = 'status stopped';
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    searchInput.disabled = false;
    minPriceInput.disabled = false;
    maxPriceInput.disabled = false;
    maxMessagesInput.disabled = false;
    geminiApiKeyInput.disabled = false;
    userPersonaInput.disabled = false;
  }
}

// Update status with message count
function updateStatus() {
  chrome.runtime.sendMessage({ action: 'status' }, (response) => {
    if (response && response.success) {
      updateUI(response.isRunning);
      
      // Update status text with message count if running
      if (response.isRunning) {
        const statusDiv = document.getElementById('status');
        const messagesText = response.messagesSent !== undefined 
          ? ` (${response.messagesSent}/${response.maxMessages || 3} messages sent)`
          : '';
        statusDiv.textContent = 'Status: Running' + messagesText;
      }
    }
  });
}

// Get current status
updateStatus();

// Periodically update status to show message count
setInterval(updateStatus, 2000);

// Start button
document.getElementById('startBtn').addEventListener('click', () => {
  const keyword = searchInput.value.trim();
  const minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
  const maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
  const maxMessages = maxMessagesInput.value ? parseInt(maxMessagesInput.value) : 3;
  const geminiApiKey = geminiApiKeyInput.value.trim();
  const userPersona = userPersonaInput.value.trim();
  
  if (!keyword) {
    alert('Please enter a search term (e.g., chair, bike, laptop)');
    searchInput.focus();
    return;
  }
  
  if (!geminiApiKey) {
    alert('Please enter your Gemini API key to enable AI-powered conversations');
    geminiApiKeyInput.focus();
    return;
  }
  
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    alert('Minimum price cannot be greater than maximum price');
    return;
  }
  
  if (maxMessages < 1 || maxMessages > 20) {
    alert('Number of messages must be between 1 and 20');
    maxMessagesInput.focus();
    return;
  }
  
  // Save all settings
  chrome.storage.sync.set({ 
    searchKeyword: keyword,
    minPrice: minPrice,
    maxPrice: maxPrice,
    maxMessages: maxMessages,
    geminiApiKey: geminiApiKey,
    userPersona: userPersona
  }, () => {
    chrome.runtime.sendMessage({ 
      action: 'start', 
      keyword: keyword,
      minPrice: minPrice,
      maxPrice: maxPrice,
      maxMessages: maxMessages,
      geminiApiKey: geminiApiKey,
      userPersona: userPersona
    }, (response) => {
      if (response && response.success) {
        updateUI(true);
      }
    });
  });
});

// Stop button
document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stop' }, (response) => {
    if (response && response.success) {
      updateUI(false);
    }
  });
});

