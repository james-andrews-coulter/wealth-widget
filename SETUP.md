# Initial Setup Guide

## Quick Setup (5 minutes)

### Step 1: Set Up Data Directory in iCloud

The widget needs a folder to store your transaction data.

**On iOS/iPhone:**
1. Open **Files** app
2. Navigate to **iCloud Drive**
3. Find or create folder: **Scriptable**
4. Inside Scriptable folder, create new folder: **WealthWidget**

**On macOS:**
1. Open **Finder**
2. Go to **iCloud Drive** → **Scriptable**
3. Create folder: **WealthWidget**

**Final path should be:** `iCloud Drive/Scriptable/WealthWidget/`

### Step 2: Add Transactions File

1. Create a new text file named `transactions.csv`
2. Add the following content:

```csv
symbol,quantity,price,date
AAPL,25,142.50,2024-03-15
MSFT,15,310.00,2024-01-20
GOOGL,10,125.75,2024-06-01
AMZN,20,155.00,2024-02-10
NVDA,8,450.00,2024-04-22
```

3. Save it to `iCloud Drive/Scriptable/WealthWidget/transactions.csv`

**Quick method - Copy from repo:**
```bash
# If you have iCloud Drive access from terminal:
cp data/transactions.csv ~/Library/Mobile\ Documents/com~apple~CloudDocs/Scriptable/WealthWidget/
```

### Step 3: Deploy Widget to Scriptable

1. **Build the widget:**
   ```bash
   cd /Users/jamesalexander/wealth_widget
   npm run build
   ```

2. **Copy to Scriptable:**
   - Open `dist/widget.js` in text editor
   - Copy entire contents (Cmd+A, Cmd+C)
   - Open **Scriptable** app
   - Tap **+** to create new script
   - Name it **"Wealth Widget"**
   - Paste contents
   - Tap **Done**

### Step 4: Test the Widget

**Test in Scriptable app:**
1. In Scriptable, tap **"Wealth Widget"** script
2. Tap **▶ Play** button
3. You should see a menu with your portfolio info

**Add to Home Screen:**
1. Long-press home screen → **+**
2. Search **"Scriptable"**
3. Choose **Large** widget
4. Long-press widget → **Edit Widget**
5. Select **"Wealth Widget"** script
6. Tap outside to finish

## Troubleshooting Setup

### ❌ Error: "You don't have permission to save..."

**Cause:** Widget is trying to access local filesystem path that doesn't exist.

**Solution:**
1. Make sure `iCloud Drive/Scriptable/WealthWidget/` folder exists
2. Make sure `transactions.csv` file is in that folder
3. Rebuild widget: `npm run build`
4. Re-copy `dist/widget.js` to Scriptable

### ❌ Error: "Can't find variable..."

**Cause:** You copied source file instead of built file.

**Solution:**
1. Run `npm run build`
2. Copy `dist/widget.js` (NOT `src/widget.js`)

### ✅ Verify Data Location

In Scriptable app, you can check the data path by running this test script:

```javascript
const fm = FileManager.iCloud();
const docsDir = fm.documentsDirectory();
const dataPath = fm.joinPath(docsDir, "WealthWidget");

console.log("Data path: " + dataPath);
console.log("Exists: " + fm.fileExists(dataPath));

if (fm.fileExists(dataPath)) {
  const files = fm.listContents(dataPath);
  console.log("Files: " + files.join(", "));
}
```

Expected output:
```
Data path: /var/mobile/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/WealthWidget
Exists: true
Files: transactions.csv
```

## Data File Format Reference

### transactions.csv

**Headers (required):**
```csv
symbol,quantity,price,date
```

**Example entries:**
```csv
AAPL,10,150.00,2024-01-15      # Buy 10 AAPL at $150
AAPL,-5,175.00,2024-06-20      # Sell 5 AAPL at $175
GOOGL,3,2850.50,2024-03-10     # Buy 3 GOOGL at $2850.50
BTC-EUR,0.5,45000.00,2024-04-01  # Buy 0.5 BTC (in EUR)
```

**Rules:**
- Symbol: Ticker symbol (must match Yahoo Finance)
- Quantity: Positive = buy, negative = sell
- Price: Price per share in EUR (or local currency)
- Date: YYYY-MM-DD format

**Supported symbols:**
- Stocks: `AAPL`, `MSFT`, `GOOGL`, etc.
- Crypto: `BTC-EUR`, `ETH-EUR`, etc.
- Any symbol available on Yahoo Finance

## Next Steps

After setup is complete:

1. **Edit your portfolio:**
   - Open `iCloud Drive/Scriptable/WealthWidget/transactions.csv`
   - Add/remove/edit your actual transactions
   - Save file
   - Widget will refresh on next load

2. **Create Apple Shortcuts** (optional):
   - "Add Transaction" shortcut to append new trades
   - "Refresh Prices" shortcut to update market data
   - See main README.md for details

3. **Customize** (optional):
   - Edit `src/lib/formatters.js` to change colors
   - Edit `src/lib/config.js` to change currency
   - Rebuild and redeploy

## File Locations Summary

| Purpose | Location | Notes |
|---------|----------|-------|
| **Transaction data** | `iCloud Drive/Scriptable/WealthWidget/transactions.csv` | Edit this to manage portfolio |
| **Price cache** | `iCloud Drive/Scriptable/WealthWidget/prices.csv` | Auto-generated, can delete |
| **Widget code** | Scriptable app | Copy from `dist/widget.js` |
| **Development** | `/Users/jamesalexander/wealth_widget/` | Git repo on Mac |

You're all set! 🎉
