# Next Steps & Enhancements

## ✅ Current Status

Your wealth widget is **fully functional** with:
- Portfolio tracking with real-time prices
- Historical wealth chart
- P/L metrics (Day, MTD-1, YTD, All-time)
- Git-ready codebase
- iCloud data storage

## 🎯 Immediate Actions (Do These First)

### 1. Add Your Real Portfolio (5 min)

**Edit transactions file:**
```bash
open ~/Library/Mobile\ Documents/com~apple~CloudDocs/Scriptable/WealthWidget/transactions.csv
```

**Replace example data with your actual trades:**
```csv
symbol,quantity,price,date
AAPL,25,142.50,2024-03-15
MSFT,15,310.00,2024-01-20
GOOGL,-5,125.75,2024-11-01
BTC-EUR,0.5,45000.00,2024-06-01
```

**Negative quantity = sell:**
```csv
AAPL,10,150.00,2024-01-15    # Buy 10 shares
AAPL,-5,175.00,2024-06-20    # Sell 5 shares (now hold 5)
```

### 2. Add to Home Screen (2 min)

1. Long-press home screen → **+**
2. Search **"Scriptable"**
3. Choose **Large** widget
4. Edit Widget → Select **"Wealth Widget"**
5. Done! Now you can glance at your portfolio anytime

### 3. Test Menu Features (1 min)

**Tap the widget** (or run in Scriptable app) to see the menu:
- 🔄 Refresh Prices (will be enabled with Shortcuts)
- ➕ Add Transaction (will be enabled with Shortcuts)
- ✏️ Edit Data (opens transactions.csv)

## 🚀 Optional Enhancements

### Enhancement 1: Apple Shortcuts Integration (30 min)

Create Shortcuts to manage your portfolio from iPhone.

#### A. "Add Transaction" Shortcut

**Purpose:** Quickly add a new trade without editing the CSV file.

**Steps to create:**
1. Open **Shortcuts** app
2. Tap **+** to create new shortcut
3. Add these actions:

```
1. Ask for Input
   - Prompt: "Stock symbol (e.g., AAPL)"
   - Default: AAPL
   - Save as: Symbol

2. Ask for Input
   - Prompt: "Quantity (negative to sell)"
   - Default: 1
   - Input Type: Number
   - Save as: Quantity

3. Ask for Input
   - Prompt: "Price per share (EUR)"
   - Default: 150.00
   - Input Type: Number
   - Save as: Price

4. Get Current Date
   - Save as: Date

5. Format Date
   - Input: Date
   - Format: Custom
   - Format String: yyyy-MM-dd
   - Save as: FormattedDate

6. Text
   - Content: [Symbol],[Quantity],[Price],[FormattedDate]
   - Save as: CSVRow

7. Append to File
   - File: transactions.csv
   - Path: Scriptable/WealthWidget/transactions.csv
   - Service: iCloud Drive
   - Make New Line: Yes

8. Show Notification
   - Title: "Trade Added"
   - Body: "Added [Quantity] [Symbol] @ €[Price]"
```

4. Name shortcut: **"AddTransaction"**
5. Add to home screen or Siri

**Usage:**
- Tap shortcut → Enter trade details → Done!
- Or say: "Hey Siri, add transaction"

#### B. "Refresh Prices" Shortcut (Advanced)

**Purpose:** Force refresh market prices from Yahoo Finance.

**Option 1: Simple (Recommended)**
```
1. Open App: Scriptable
2. Run Script: Wealth Widget
3. Wait: 2 seconds
4. Return to Home Screen
```

**Option 2: Advanced (Requires JavaScript)**
Create a separate Scriptable script called "Refresh Prices":
```javascript
// Refresh Prices.js
const fm = FileManager.iCloud();
const dataPath = fm.joinPath(fm.documentsDirectory(), "WealthWidget");
const pricesPath = fm.joinPath(dataPath, "prices.csv");

// Delete price cache to force refresh
if (fm.fileExists(pricesPath)) {
  fm.remove(pricesPath);
}

// Show notification
const notification = new Notification();
notification.title = "Prices Refreshed";
notification.body = "Price cache cleared. Widget will fetch new data.";
notification.schedule();

Script.complete();
```

Then in Shortcuts:
```
1. Run Script: Refresh Prices
2. Wait: 1 second
3. Run Script: Wealth Widget
```

#### C. "Sync to iCloud" Shortcut

**Purpose:** Sync git repo data to iCloud (for development workflow).

```
1. Run Shell Script
   - Script: cp /Users/jamesalexander/wealth_widget/data/transactions.csv ~/Library/Mobile\ Documents/com~apple~CloudDocs/Scriptable/WealthWidget/
   - (Only works on Mac)

2. Show Notification
   - Title: "Synced to iCloud"
   - Body: "Transactions copied from git repo"
```

### Enhancement 2: Widget Customization (15 min)

#### Change Currency Symbol

Edit `src/lib/config.js`:
```javascript
const CONFIG = {
  transactionsFileName: "transactions.csv",
  pricesFileName: "prices.csv",
  currencySymbol: "USD",  // Change EUR → USD
  iCloudFolderName: "WealthWidget",
  gitRepoPath: "/Users/jamesalexander/wealth_widget/data"
};
```

Then rebuild and redeploy.

#### Customize Colors

Edit `src/lib/formatters.js`:
```javascript
const COLORS = {
  bg: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
  text: Color.dynamic(Color.black(), Color.white()),
  textSecondary: Color.dynamic(new Color("#6B7280"), Color.gray()),
  green: new Color("#34C759"),  // Change to your preferred green
  red: new Color("#FF3B30"),    // Change to your preferred red
  graphLine: new Color("#34C759"),
  axisLine: Color.dynamic(new Color("#E5E5EA"), new Color("#3A3A3C"))
};
```

Rebuild and redeploy.

#### Adjust Holdings Display

Edit `src/lib/ui-components.js` to show more/fewer holdings:
```javascript
// Change this line:
var displayHoldings = portfolio.holdings.slice(0, 11);
// To show 15 holdings:
var displayHoldings = portfolio.holdings.slice(0, 15);
```

### Enhancement 3: Advanced Features (1-2 hours each)

#### A. Add Target Prices & Alerts

**Modify data model:**
```csv
symbol,quantity,price,date,target_price
AAPL,10,150.00,2024-01-15,200.00
```

**Add alert logic:**
- Check if current price > target price
- Show notification if target hit
- Highlight in widget

#### B. Dividend Tracking

**Add dividend column:**
```csv
symbol,quantity,price,date,dividend
AAPL,10,150.00,2024-01-15,0.25
```

**Calculate dividend income:**
- Total annual dividends
- Dividend yield %
- Add to portfolio summary

#### C. Tax Reporting

**Calculate capital gains:**
- FIFO cost basis
- Short-term vs long-term gains
- Export tax report

#### D. Pie Chart for Allocation

**Add pie chart widget:**
- Show portfolio weight visually
- Color-coded by sector
- Small/medium widget variant

### Enhancement 4: Multi-Currency Support (30 min)

**Track purchase currency separately:**
```csv
symbol,quantity,price,date,currency
AAPL,10,150.00,2024-01-15,USD
GOOGL,5,2800.00,2024-02-20,USD
BTC-EUR,0.5,45000.00,2024-04-01,EUR
```

**Convert everything to display currency:**
- Fetch exchange rates
- Store original currency
- Display in EUR (or chosen currency)

## 📊 Testing & Validation (30 min)

### 1. Verify Calculations

**Manual check:**
1. Add a few test transactions
2. Calculate expected values manually
3. Compare with widget display
4. Verify P/L percentages match

**Test cases:**
```csv
# Simple test portfolio
AAPL,10,100.00,2024-01-01    # Cost: €1000
# If current price is €150 → Value: €1500, P/L: +€500 (+50%)
```

### 2. Test Edge Cases

- Empty portfolio (no transactions)
- Negative portfolio (all sells)
- Single stock
- 20+ stocks (performance)
- Very old transactions (5+ years)
- Future-dated transactions (should ignore)

### 3. Test Offline Mode

1. Turn off WiFi/cellular
2. Open widget
3. Should show cached prices
4. No errors or crashes

### 4. Test Price Refresh

1. Delete `prices.csv`
2. Open widget
3. Should fetch new prices
4. Should create new `prices.csv`

## 📚 Documentation (15 min)

### Create Personal Usage Guide

Document your workflow in a new file `MY_WORKFLOW.md`:
```markdown
# My Wealth Widget Workflow

## Daily Routine
- Morning: Glance at widget for portfolio status
- Check Day P/L to see overnight changes

## After Trading
1. Tap "Add Transaction" shortcut
2. Enter trade details
3. Widget auto-updates on next refresh

## Weekly Review
- Check YTD P/L progress
- Review portfolio allocation (Wt% column)
- Rebalance if any position >40%

## Monthly Review
- Export transactions.csv for records
- Compare MTD-1 P/L with market benchmarks
- Update investment strategy if needed
```

## 🎯 Success Metrics

Track these to validate the widget is meeting your goals:

- ✅ Portfolio value accuracy (compare with broker)
- ✅ Widget load time <2 seconds
- ✅ Price refresh time <5 seconds
- ✅ Using widget daily (check frequency)
- ✅ Faster than opening Google Sheets (time saved)
- ✅ Feeling confident about financial position (peace of mind)

## 🔮 Future Ideas (Backlog)

**Advanced Analytics:**
- Sharpe ratio calculation
- Risk metrics (volatility, beta)
- Performance vs. benchmarks (S&P 500, NASDAQ)
- Correlation matrix

**Data Sources:**
- Multiple broker account support
- Crypto exchange API integration
- Real estate holdings
- Bond valuations

**Visualizations:**
- Sector allocation pie chart
- Performance attribution chart
- Drawdown chart
- Return distribution histogram

**Automation:**
- Auto-import trades from broker
- Auto-sync with portfolio tracker
- Scheduled price updates (cron)
- Email/SMS alerts for big moves

**Platform Expansion:**
- macOS standalone app
- Watch complications
- iPad optimized layout
- Multi-device sync

## ⚡ Quick Reference

### Common Tasks

**Add trade:**
```bash
echo "AAPL,10,150.00,2024-01-15" >> ~/Library/Mobile\ Documents/com~apple~CloudDocs/Scriptable/WealthWidget/transactions.csv
```

**Clear price cache:**
```bash
rm ~/Library/Mobile\ Documents/com~apple~CloudDocs/Scriptable/WealthWidget/prices.csv
```

**Rebuild widget:**
```bash
cd /Users/jamesalexander/wealth_widget
npm run build
# Copy dist/widget.js to Scriptable
```

**Backup data:**
```bash
cp ~/Library/Mobile\ Documents/com~apple~CloudDocs/Scriptable/WealthWidget/transactions.csv ~/Desktop/transactions_backup.csv
```

## 🎉 You're All Set!

Your wealth widget is production-ready. Choose which enhancements matter to you and implement them at your own pace. The core functionality is complete and working!

**Recommended priority:**
1. ✅ Add real portfolio data (do this now!)
2. ✅ Add to home screen (do this now!)
3. 🟡 Create "Add Transaction" shortcut (very useful)
4. 🟡 Verify calculations with manual check (important)
5. ⚪ Other enhancements (as needed)

Enjoy your new wealth tracking widget! 📊💰
