// FB Marketplace Message Sender - Find & Send or Paste & Send

const BUTTON_ID = "fb-marketplace-sender-btn";

function extractPrice(el) {
  const text = (el.innerText || el.textContent || "").replace(/,/g, "");
  const m = text.match(/\$([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function findMessageInput() {
  return (
    document.querySelector('textarea[placeholder*="message" i]') ||
    document.querySelector('textarea[placeholder*="Message" i]') ||
    document.querySelector("textarea") ||
    document.querySelector('div[contenteditable="true"][role="textbox"]') ||
    document.querySelector('div[contenteditable="true"]')
  );
}

function insertAndSendMessage(inputEl, message) {
  inputEl.focus();
  if (inputEl.contentEditable === "true" || inputEl.tagName === "DIV") {
    inputEl.innerHTML = "";
    document.execCommand("insertText", false, message);
    if (!inputEl.innerText) {
      inputEl.innerText = message;
      inputEl.textContent = message;
    }
    inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, data: message }));
  } else {
    inputEl.value = message;
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  }
  setTimeout(() => {
    const sendBtn = Array.from(
      document.querySelectorAll('div[role="button"], span[role="button"], button, [aria-label]')
    ).find((el) => {
      const t = (el.innerText || el.textContent || el.getAttribute("aria-label") || "").toLowerCase();
      return t.includes("send");
    });
    if (sendBtn) {
      sendBtn.click();
      sendBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    } else {
      inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
      inputEl.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    }
  }, 500);
}

function waitFor(selector, timeout = 10000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const start = Date.now();
    const iv = setInterval(() => {
      const e = document.querySelector(selector);
      if (e || Date.now() - start > timeout) {
        clearInterval(iv);
        resolve(e);
      }
    }, 250);
  });
}

function showStatus(msg) {
  const id = "fbm-status";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.style.cssText = "position:fixed;bottom:80px;right:24px;z-index:2147483647;padding:12px 16px;background:#333;color:#fff;border-radius:8px;font-size:13px;font-family:sans-serif;max-width:280px;";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  setTimeout(() => el.remove(), 4000);
}

async function runFindAndSend() {
  const { findAndSendPayload } = await chrome.storage.local.get("findAndSendPayload");
  if (!findAndSendPayload?.message || !findAndSendPayload?.searchKeyword) return;

  const { message, searchKeyword, maxPrice, minPrice } = findAndSendPayload;
  const kw = searchKeyword.toLowerCase().trim();
  const kwWords = kw.split(/\s+/).filter((w) => w.length > 1);

  showStatus("Finding listings...");

  // Wait for page to fully load (Facebook loads content dynamically)
  await new Promise((r) => setTimeout(r, 3000));

  let listings = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
  if (listings.length === 0) {
    listings = Array.from(document.querySelectorAll('[href*="/marketplace/item/"]'));
  }
  for (let i = 0; i < 10 && listings.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    listings = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
  }

  if (listings.length === 0) {
    showStatus("No listings found. Try a different search.");
    await chrome.storage.local.remove("findAndSendPayload");
    return;
  }

  const candidates = [];
  for (const a of listings) {
    const text = (a.innerText || a.textContent || "").toLowerCase();
    const matches = kwWords.length === 0 || kwWords.some((w) => text.includes(w));
    if (!matches) continue;
    const price = extractPrice(a);
    if (minPrice != null && price != null && price < minPrice) continue;
    if (maxPrice != null && price != null && price > maxPrice) continue;
    candidates.push({ el: a, price: price ?? 999999, text: text.split("\n")[0] });
  }

  const list = candidates.length > 0 ? candidates : listings.slice(0, 3).map((el) => ({ el, price: 999999, text: "" }));
  list.sort((a, b) => a.price - b.price);
  const best = list[0];

  showStatus("Opening listing...");
  best.el.scrollIntoView({ behavior: "smooth", block: "center" });
  await new Promise((r) => setTimeout(r, 800));
  best.el.click();

  await new Promise((r) => setTimeout(r, 3000));

  showStatus("Looking for Message button...");
  const msgBtns = Array.from(document.querySelectorAll('div[role="button"], span[role="button"], a[role="button"], button'));
  const msgBtn = msgBtns.find((el) => {
    const t = (el.innerText || el.textContent || el.getAttribute("aria-label") || "").trim().toLowerCase();
    return t === "message" || t === "send message" || (t.includes("message") && t.length < 30);
  });

  if (msgBtn) {
    msgBtn.click();
    msgBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 3000));
  }

  showStatus("Sending message...");
  const input = await waitFor('textarea, div[contenteditable="true"][role="textbox"], div[contenteditable="true"]');
  if (input) {
    insertAndSendMessage(input, message.trim());
    showStatus("Message sent!");
  } else {
    showStatus("Could not find message box. Try clicking Message manually.");
  }

  await chrome.storage.local.remove("findAndSendPayload");
}

async function getPayloadFromWebApp() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getMessage" }, (res) => {
      resolve(res?.message && res?.searchKeyword ? res : null);
    });
  });
}

async function checkAndRunFindAndSend() {
  const url = window.location.href;
  if (!url.includes("facebook.com/marketplace")) return;

  let payload = (await chrome.storage.local.get("findAndSendPayload")).findAndSendPayload;
  if (!payload) {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      payload = await getPayloadFromWebApp();
      if (payload) break;
    }
  }
  if (!payload?.message || !payload?.searchKeyword) return;

  await chrome.storage.local.set({ findAndSendPayload: payload });
  await runFindAndSend();
}

async function getMessageFromWebApp() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getMessage" }, (response) => {
      resolve(chrome.runtime.lastError ? { success: false } : response || { success: false });
    });
  });
}

async function handlePasteAndSend() {
  const btn = document.getElementById(BUTTON_ID);
  const orig = btn.textContent;
  btn.textContent = "Loading...";
  btn.disabled = true;

  const res = await getMessageFromWebApp();
  const message = res?.message || "";

  if (!message?.trim()) {
    alert("No message. Generate in the web app and click 'Find & Send to 1 Seller' first.");
    btn.textContent = orig;
    btn.disabled = false;
    return;
  }

  const input = findMessageInput();
  if (!input) {
    alert("Could not find message input. Open the conversation first.");
    btn.textContent = orig;
    btn.disabled = false;
    return;
  }

  insertAndSendMessage(input, message.trim());
  btn.textContent = "Sent!";
  setTimeout(() => {
    btn.textContent = orig;
    btn.disabled = false;
  }, 1500);
}

function injectButton() {
  if (document.getElementById(BUTTON_ID)) return;
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "Paste & Send";
  btn.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:2147483647;padding:10px 16px;
    background:#1877f2;color:white;border:none;border-radius:8px;
    font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;cursor:pointer;
    box-shadow:0 4px 12px rgba(0,0,0,0.2);
  `;
  btn.addEventListener("click", handlePasteAndSend);
  document.body.appendChild(btn);
}

function init() {
  if (document.body) {
    setTimeout(injectButton, 1500);
    checkAndRunFindAndSend();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

const obs = new MutationObserver(() => {
  if (document.body && !document.getElementById(BUTTON_ID)) injectButton();
});
if (document.body) {
  obs.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener("DOMContentLoaded", () => obs.observe(document.body, { childList: true, subtree: true }));
}
