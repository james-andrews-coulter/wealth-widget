# Wealth Widget

A git-ready Scriptable widget for tracking your investment portfolio with real-time wealth visualization.

## Features

- 📊 Real-time portfolio tracking with Yahoo Finance integration
- 📈 Historical wealth accumulation chart with adaptive sampling
- 💰 P/L metrics: Daily, MTD-1, YTD, and All-time
- 🔄 Batched API calls for fast performance (70% faster than sequential)
- 📂 Git-ready modular architecture
- ☁️ Dual deployment: local development + iCloud production
- 🎨 Light/dark mode support

## Quick Start

### 1. Installation

```bash
git clone <your-repo-url> wealth_widget
cd wealth_widget
npm install  # Optional: for build tooling
```

### 2. Add Transactions

Edit `data/transactions.csv`:

```csv
symbol,quantity,price,date
AAPL,25,142.50,2024-03-15
MSFT,15,310.00,2024-01-20
GOOGL,10,125.75,2024-06-01
```

### 3. Build & Deploy

```bash
# Build the widget
npm run build

# Copy dist/widget.js content to Scriptable app
# Add widget to home screen
```

## Development

### Project Structure

```
wealth_widget/
├── src/
│   ├── lib/
│   │   ├── config.js          # Environment & path resolution
│   │   ├── data-loader.js     # CSV reading/writing
│   │   ├── calculations.js    # Portfolio math
│   │   ├── api-client.js      # Yahoo Finance (batched)
│   │   ├── chart-renderer.js  # Canvas drawing
│   │   ├── formatters.js      # Number formatting
│   │   └── ui-components.js   # Widget layouts
│   └── widget.js              # Main entry point
├── data/
│   ├── transactions.csv       # Transaction ledger
│   └── prices.csv            # Price cache (auto-generated)
├── dist/
│   └── widget.js             # Built widget (deploy this)
└── build.js                  # Build script
```

### Local Development

1. **Edit code** in `src/lib/` modules
2. **Build** with `npm run build`
3. **Test** by copying `dist/widget.js` to Scriptable
4. **Commit** changes to git

### Environment Detection

The widget automatically detects whether it's running in development or production:

- **Development**: Reads from `/Users/jamesalexander/wealth_widget/data`
- **Production**: Reads from `iCloud Drive/WealthWidget/`

## Data Model

### transactions.csv

```csv
symbol,quantity,price,date
AAPL,10,150.00,2024-01-15
AAPL,-5,155.00,2024-06-10  # Negative = sell
GOOGL,5,2800.00,2024-02-20
BTC-EUR,0.5,30000.00,2024-04-05
```

### prices.csv (auto-generated)

```csv
ticker,date,price
AAPL,2024-01-15,150.00
AAPL,2024-01-16,151.20
GOOGL,2024-02-20,2800.00
```

## Apple Shortcuts Integration

### Add Transaction Shortcut
1. Open Shortcuts app
2. Create shortcut with:
   - Prompt for: date, ticker, quantity, price
   - Append to `iCloud/WealthWidget/transactions.csv`
3. Name it "AddTransaction"

### Refresh Prices Shortcut
1. Create shortcut to run widget refresh
2. Fetches missing prices from Yahoo Finance
3. Updates `prices.csv` cache
4. Name it "RefreshPrices"

### Sync to iCloud Shortcut
1. Copy `data/transactions.csv` → `iCloud/WealthWidget/`
2. Copy `dist/widget.js` → Scriptable app
3. Name it "SyncToiCloud"

## Performance Optimizations

- **Batched API Calls**: All Yahoo Finance requests run in parallel
- **Adaptive Chart Sampling**:
  - Last 6 months: Daily data points
  - 6 months - 2 years: Weekly
  - 2+ years ago: Monthly
- **Price Caching**: Avoids redundant API calls

## Widget Display

### Large Widget Layout

```
┌─────────────────────────────┐
│ 💰 Portfolio      €45,230   │
├─────────────────────────────┤
│ Day: +€234  MTD-1: +€890    │
│ YTD: +€12,340  All: +€18K   │
├─────────────────────────────┤
│ [Wealth accumulation chart] │
├─────────────────────────────┤
│ Symbol  Value   P/L   A%    │
│ AAPL   €5,200  +€234  8.5%  │
│ GOOGL  €8,900  -€120  12.3% │
│ BTC    €28,000 +€3400 45.2% │
└─────────────────────────────┘
```

## Troubleshooting

### Widget shows "N/A" values
- No internet connection → Using cached prices
- Run "Refresh Prices" shortcut when back online

### Build fails
- Ensure all files in `src/lib/` exist
- Check Node.js is installed: `node --version`

### Transactions not showing
- Check CSV format (no extra commas or quotes)
- Verify file is at `data/transactions.csv`

## Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/xyz`
3. Make changes in `src/` files
4. Build and test: `npm run build`
5. Commit: `git commit -am 'Add feature xyz'`
6. Push: `git push origin feature/xyz`
7. Open pull request

## License

MIT

## Acknowledgments

- Built with [Scriptable](https://scriptable.app/)
- Market data from [Yahoo Finance](https://finance.yahoo.com/)
- Inspired by personal wealth tracking needs
