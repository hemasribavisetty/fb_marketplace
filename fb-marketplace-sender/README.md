# FB Marketplace Message Sender

Chrome extension that finds matching listings and sends messages from the [FB Marketplace Web App](../fb-marketplace-webapp).

## Find & Send (Automated)

1. In the web app: enter listing title, **search keyword** (e.g. "wooden chair"), and optional max price
2. Generate a message
3. Click **"Find & Send to 1 Seller"**
4. Click the **extension icon** and choose **"Find & Send"**
5. The extension opens Marketplace, searches for matching listings, picks the best match (1 seller), and sends the message automatically

## Paste & Send (Manual)

If you're already on a conversation, use the blue **"Paste & Send"** button (bottom-right) to paste the stored message.

## Requirements

- The **web app must be running** (python3 app.py) so the extension can fetch messages
- You must be logged into Facebook

## Install

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `fb-marketplace-sender` folder

## Create Icons (if needed)

If icons are missing, run:

```bash
python3 create_icons.py
```
