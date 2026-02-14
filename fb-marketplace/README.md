# FB Marketplace Helper - Background Extension

A Chrome extension that automatically searches Facebook Marketplace in the background without requiring you to keep Facebook open in your active tabs.

## Features

- ✅ **Background Operation**: Works without keeping Facebook open in your active tabs
- ✅ **Automatic Search**: Continuously searches for items matching your keyword
- ✅ **Auto-refresh**: Refreshes the marketplace page every 30 seconds
- ✅ **Easy Control**: Simple popup interface to start/stop the search

## Setup Instructions

### 1. Create Icon Files

The extension requires icon files. You can create simple placeholder icons or use any 16x16, 48x48, and 128x128 pixel images:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

You can:
- Use any image editor to create simple icons
- Download free icons from sites like [Flaticon](https://www.flaticon.com)
- Use a simple colored square as a placeholder

### 2. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `fb-marketplace` folder
5. The extension should now appear in your extensions list

### 3. Configure Your Search

Edit `content.js` to customize:
- `KEYWORD`: Change "bike" to whatever you're searching for
- `MESSAGE_TEXT`: Customize the message sent to sellers

### 4. Use the Extension

1. Click the extension icon in Chrome's toolbar
2. Click **"Start Background Search"**
3. The extension will:
   - Open Facebook Marketplace in a background tab
   - Automatically search for items matching your keyword
   - Refresh every 30 seconds
   - Send messages when items are found

## How It Works

1. **Background Service Worker** (`background.js`): 
   - Creates and manages background tabs
   - Handles the search lifecycle
   - Communicates with content scripts

2. **Content Script** (`content.js`):
   - Runs on Facebook Marketplace pages
   - Scans for listings matching your keyword
   - Handles clicking and messaging

3. **Popup UI** (`popup.html`):
   - Provides start/stop controls
   - Shows current status

## Configuration

You can modify these settings in `background.js`:

- `SEARCH_INTERVAL`: How often to refresh (default: 30000ms = 30 seconds)
- `MARKETPLACE_URL`: The Facebook Marketplace URL to use

## Permissions

The extension requires:
- `tabs`: To create and manage background tabs
- `scripting`: To inject content scripts
- `storage`: For saving settings (future use)
- `host_permissions`: Access to Facebook domains

## Troubleshooting

- **Extension not working**: Check the browser console (F12) and extension service worker logs
- **Icons missing**: Create the required icon files (see Setup step 1)
- **Search not finding items**: Verify your keyword matches items on Facebook Marketplace
- **Messages not sending**: Facebook may have changed their UI - check selectors in `content.js`

## Notes

- The extension opens Facebook Marketplace in a background tab (not visible but active)
- You need to be logged into Facebook for this to work
- Facebook's UI may change, requiring updates to selectors in `content.js`

