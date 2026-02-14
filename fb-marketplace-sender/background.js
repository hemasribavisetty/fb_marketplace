// Fetch payload from web app for the content script
const WEBAPP_URL = "http://127.0.0.1:5001";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getMessage") {
    fetch(`${WEBAPP_URL}/api/latest-message`)
      .then((r) => r.json())
      .then((data) => sendResponse({ success: true, ...data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
