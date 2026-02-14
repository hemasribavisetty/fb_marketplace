# FB Marketplace Helper - Web App

A web application that provides the same AI-powered message generation as the Chrome extension. Use it when you prefer a standalone app or when the extension isn't available.

## Features

- **Initial Message Generator** – Paste listing details (title, price, description) and get an AI-generated, natural first message to send to sellers
- **Reply Generator** – Paste the seller's message (and optional conversation history) to get contextual AI replies
- **Custom Persona** – Describe how you want to communicate (e.g., "I'm a student looking for affordable furniture")
- **Gemini API** – Uses Google's Gemini AI (same as the extension)

## What This App Does vs. the Extension

| Feature | Extension | Web App |
|--------|-----------|---------|
| AI initial messages | ✅ Auto | ✅ Generate & copy |
| AI reply generation | ✅ Auto | ✅ Generate & copy |
| Custom persona | ✅ | ✅ |
| Background search | ✅ | ❌ (manual) |
| Auto-messaging | ✅ | ❌ (manual copy-paste) |
| Runs anywhere | Chrome only | Any browser |

The web app gives you the **same AI logic** but with a manual workflow: generate a message, copy it, and paste it when you contact the seller on Facebook.

## Setup

### 1. Install dependencies

```bash
cd fb-marketplace-webapp
pip install -r requirements.txt
```

### 2. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Save it in the app's Settings tab

### 3. Run the app

```bash
python app.py
```

Open [http://127.0.0.1:5001](http://127.0.0.1:5001) in your browser.

## Usage

1. **Settings** – Add your Gemini API key and optional persona. These are stored in your browser.
2. **Initial Message** – Enter listing title, price, and description, then click Generate. Copy the message and paste it when messaging the seller on Facebook.
3. **Reply to Seller** – Paste the seller's message and any conversation history. Generate a reply, copy it, and paste it in Messenger.

## Quick Links

- [Open Facebook Marketplace](https://www.facebook.com/marketplace)
- [Get Gemini API Key](https://aistudio.google.com/app/apikey)
