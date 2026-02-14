document.getElementById("findAndSend").addEventListener("click", async () => {
  const btn = document.getElementById("findAndSend");
  btn.disabled = true;
  btn.textContent = "Loading...";

  try {
    const res = await fetch("http://127.0.0.1:5001/api/latest-message");
    const data = await res.json();
    const { message, searchKeyword } = data;

    if (!message || !searchKeyword) {
      alert("No message or search keyword. Generate in the web app and click 'Find & Send to 1 Seller' first.");
      btn.disabled = false;
      btn.textContent = "Find & Send to 1 Seller";
      return;
    }

    await chrome.storage.local.set({
      findAndSendPayload: {
        message,
        searchKeyword: searchKeyword.trim(),
        maxPrice: data.maxPrice || null,
        minPrice: data.minPrice || null,
      },
    });

    const url = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(searchKeyword.trim())}`;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.includes("facebook.com")) {
      await chrome.tabs.update(tab.id, { url });
    } else {
      await chrome.tabs.create({ url });
    }
    window.close();
  } catch (e) {
    alert("Is the web app running? Start it with: python3 app.py");
  }
  btn.disabled = false;
  btn.textContent = "Find & Send to 1 Seller";
});
