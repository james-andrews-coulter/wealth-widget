# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Scriptable iOS widget for tracking investment portfolios with real-time wealth visualization. The codebase uses a unique git-ready modular architecture that compiles to a single file for deployment to the Scriptable app.

## Build System

### Build Commands

```bash
# Build the widget (concatenates all modules into dist/widget.js)
npm run build

# Watch mode for development
npm run watch
```

### Build Architecture

The build system (`build.js`) concatenates source modules in dependency order and strips ES6 module syntax for Scriptable compatibility:

1. **Module Load Order** (defined in `build.js`):
   - `lib/config.js` - Environment detection and path resolution
   - `lib/formatters.js` - Number/currency formatting
   - `lib/data-loader.js` - CSV reading/writing
   - `lib/api-client.js` - Yahoo Finance API with batching
   - `lib/calculations.js` - Portfolio math and P/L calculations
   - `lib/chart-renderer.js` - Canvas drawing
   - `lib/ui-components.js` - Widget layouts
   - `widget.js` - Main entry point

2. **ES6 Stripping**: All `export`/`import` statements are removed during build since Scriptable doesn't support ES6 modules. Functions become globally available in the concatenated output.

3. **Output**: `dist/widget.js` is the deployable file that gets copied to the Scriptable app.

**IMPORTANT**:
- Source files in `src/` use ES6 syntax but are for development only
- Never run source files directly in Scriptable - they must be built first
- All source files have a comment warning about this

## Code Architecture

### Dual Environment System

The widget runs in two environments, automatically detected via `config.runsInWidget`:

**Development** (local testing):
- Reads from `/Users/jamesalexander/wealth_widget/data`
- Uses `FileManager.local()`
- Detected when `config.runsInWidget` is false

**Production** (on-device widget):
- Reads from `iCloud Drive/WealthWidget/`
- Uses `FileManager.iCloud()`
- Detected when `config.runsInWidget` is true

This dual-path architecture is implemented in `src/lib/config.js` functions: `isDevelopment()`, `getFileManager()`, `getDataPath()`.

### Data Flow

1. **Transaction Ledger** (`data/transactions.csv`):
   - Source of truth for all portfolio activity
   - Format: `symbol,quantity,price,date`
   - Negative quantities = sell transactions
   - Aggregated into current holdings by `readHoldings()`

2. **Price Cache** (`data/prices.csv`):
   - Auto-generated cache to avoid redundant API calls
   - Format: `ticker,date,price`
   - Updated on each successful API fetch
   - Fallback when offline

3. **API Layer** (`src/lib/api-client.js`):
   - Yahoo Finance integration
   - **Batched fetching**: All API calls run in parallel via `Promise.all`
   - Functions: `fetchMultipleStockPricesBatched()`, `fetchMultipleHistoricalBatched()`, `fetchMultipleEURRates()`
   - 70% faster than sequential fetching

4. **Calculations** (`src/lib/calculations.js`):
   - Portfolio aggregation with currency conversion to EUR
   - P/L metrics: Day, MTD-1, YTD, All-time
   - Historical portfolio values with adaptive sampling:
     - Last 6 months: Daily data points
     - 6 months - 2 years: Weekly
     - 2+ years ago: Monthly

### Key Architectural Patterns

**Module Communication**: Since ES6 modules are stripped, all functions become global after build. Dependencies are managed through build order, not imports.

**Error Handling Strategy**:
- API errors trigger fallback to cached prices
- Offline detection: if all prices error, widget switches to cache mode
- Missing data shows "N/A" rather than crashing

**Performance Optimizations**:
- Batched API calls (parallel execution)
- Adaptive chart sampling (reduces data points for old history)
- Price caching (avoids redundant fetches)

## Development Workflow

1. Edit source files in `src/lib/` or `src/widget.js`
2. Run `npm run build` to generate `dist/widget.js`
3. Copy `dist/widget.js` content to Scriptable app
4. Test widget on device or in Scriptable simulator
5. Commit changes to git (only source files, not dist)

**Important**: When modifying the architecture:
- Respect the module load order in `build.js`
- Remember functions need to be defined before use (no hoisting across modules)
- Test both development and production environments
- Verify offline fallback behavior

## Data Files

**Important**: Files in `/data/` are now symlinks to the real CSV stores that Scriptable uses on the device. They are no longer examples—modifications to these files directly affect the widget's data.

**Never commit**: `data/prices.csv` (auto-generated cache, symlink target updated by widget)

**Always commit**: `data/transactions.csv` (source of truth, symlink target is the authoritative ledger)

## Testing Environments

To test the dual-environment system:
- **Development mode**: Run script manually in Scriptable (not as widget)
- **Production mode**: Add to home screen as widget

The environment detection is automatic based on `config.runsInWidget`.
