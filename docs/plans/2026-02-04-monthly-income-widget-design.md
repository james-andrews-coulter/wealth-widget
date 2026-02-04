# Monthly Income Widget Design

**Date:** 2026-02-04
**Purpose:** Create a second Scriptable widget to visualize monthly passive income (unrealized P/L) from investment portfolio

## Overview

A large widget that displays monthly profit/loss over a calendar year, with per-stock attribution breakdown. Answers the question: "What regular passive monthly income have I historically made from these investments?"

## User Requirements

- **Primary metric:** Monthly unrealized market appreciation (excludes capital additions/withdrawals)
- **Time range:** Calendar year view with tap-to-cycle through historical years (2025 → 2024 → ... → 2020 → 2025)
- **Breakdown:** Individual stock contribution to yearly P/L
- **Data source:** Same `transactions.csv` used by existing widget

## Architecture

### File Structure

```
src/
  lib/                    (shared, no changes)
  widget.js               (existing portfolio widget)
  income-widget.js        (NEW - monthly P/L widget)

dist/
  widget.js               (existing compiled)
  income-widget.js        (NEW - compiled monthly P/L widget)

data/
  income-widget-state.json (NEW - stores current year offset)
```

### Build System

Update `build.js` to support multiple build targets:
- Add second concatenation pipeline for income-widget
- Same lib modules + `income-widget.js` instead of `widget.js`

### Code Reuse

**Existing modules (no changes):**
- `config.js` - Environment detection
- `data-loader.js` - Transaction/price reading (add state persistence functions)
- `formatters.js` - Number formatting
- `api-client.js` - Yahoo Finance API

**Extensions needed:**
- `calculations.js` - Add `calculateMonthlyPL()` and `calculateStockAttribution()`
- `chart-renderer.js` - Add `drawBarChart()` for vertical bars with gridlines
- `ui-components.js` - Add `createIncomeLargeWidget()` layout

## Data Calculations

### Monthly P/L Calculation

**Function:** `calculateMonthlyPL(year, transactions, holdings, eurRates)`

**Logic:**
```javascript
for each month (1-12):
  monthStart = first day of month
  monthEnd = last day of month

  // Aggregate holdings and cost basis at boundaries
  holdingsAtStart = aggregateTransactionsUpTo(monthStart)
  holdingsAtEnd = aggregateTransactionsUpTo(monthEnd)

  // Fetch historical prices
  pricesAtStart = getHistoricalPrices(symbols, monthStart)
  pricesAtEnd = getHistoricalPrices(symbols, monthEnd)

  // Calculate portfolio value and cost
  valueAtStart = sum(holdings * prices) in EUR
  costAtStart = sum(holdings * purchasePrice) in EUR
  valueAtEnd = sum(holdings * prices) in EUR
  costAtEnd = sum(holdings * purchasePrice) in EUR

  // Monthly P/L = change in unrealized P/L
  startPL = valueAtStart - costAtStart
  endPL = valueAtEnd - costAtEnd
  monthlyPL[month] = endPL - startPL
```

**Per-Stock Attribution:**
- Calculate same monthly P/L formula for each symbol individually
- Sum across all 12 months to get yearly contribution per stock
- Calculate percentage: `(stockYearlyPL / totalYearlyPL) * 100`

### Edge Cases

1. **Months before first transaction:** P/L = €0
2. **Future months in current year:** P/L = €0
3. **Partial first month (Mar 10, 2020):** Use first transaction date as month-start instead of Mar 1
4. **Missing price data:** Use closest available historical price
5. **Negative total P/L:** Display as negative values with red color

## Visual Design

### Widget Layout (Large)

```
┌─────────────────────────────────────┐
│ €5,420                              │  ← Total year P/L
│ €542/mo · 2025                      │  ← Average · Year
│                                     │
│     [Bar Chart - 12 months]         │
│ €2k ┤─────────────────── ▮          │  ← Gridlines for
│     │                   ▮ ▮          │     precise reading
│ €1k ┤───────────── ▮ ▮ ▮ ▮          │
│     │         ▮ ▮ ▮ ▮ ▮ ▮ ▮          │
│  €0 └─────────────────────          │
│      J F M A M J J A S O N D        │
│                                     │
│ ─────────────────────────           │
│                                     │
│ VUSA.AS      +€2,340      45%      │  ← 10 stock rows
│ BTC-EUR      +€1,200      23%      │     (green = gains)
│ NDIA.AS      +€1,100      21%      │
│ WTAI.L         +€450       9%      │
│ IEMS.L          +€80       2%      │
│ VWRL.AS         +€50       1%      │
│ CSUSS.MI        +€40       1%      │
│ VFEM.AS         -€20       0%      │
│ WSML.L         -€120      -2%      │  ← (red = losses)
│ EQAC.MI        -€180      -3%      │
└─────────────────────────────────────┘
```

### Space Allocation
- Header (title + subtitle): ~10%
- Bar chart: ~50%
- Stock breakdown: ~40% (fixed layout for 10 rows)

### Bar Chart Features

**New function:** `drawBarChart(context, monthlyData, bounds)`

- 12 vertical bars (J F M A M J J A S O N D)
- All bars extend upward from baseline
- Color-coded: Green for positive P/L, red for negative
- Horizontal gridlines at regular intervals (€500, €1k, €1.5k...)
- Y-axis labels showing value scale
- Always show all 12 months (€0 bars for empty months)

### Color Scheme

- Positive bars/text: `COLORS.graphLine` (existing green/teal)
- Negative bars/text: Red (new constant)
- Use existing color constants for consistency with main widget

### Stock Breakdown

- Show all 10 holdings (no truncation/grouping)
- Sort by P/L descending (best performers first)
- Format: `SYMBOL    +€amount    percent%`
- Color-coded text matching sign

## User Interaction

### Tap Behavior

1. User taps widget → increment year counter
2. Wrap-around cycling: 2025 → 2024 → 2023 → 2022 → 2021 → 2020 → 2025
3. Recalculate monthly P/L for new year
4. Re-render widget with updated data

### State Persistence

**File:** `data/income-widget-state.json`

**Format:**
```json
{
  "yearOffset": 0
}
```

- `yearOffset: 0` = current year (2025)
- `yearOffset: 1` = last year (2024)
- etc.

**Functions in data-loader.js:**
- `readIncomeWidgetState()` - load offset, default to 0
- `writeIncomeWidgetState(offset)` - persist on tap

**Year Calculation:**
```javascript
var availableYears = getYearsFromTransactions(); // [2020, 2021, ..., 2025]
var offset = await readIncomeWidgetState();
var currentIndex = offset % availableYears.length;
var displayYear = availableYears[availableYears.length - 1 - currentIndex];
```

## Data & Performance

### Historical Price Requirements

For each year displayed:
- Month-start prices (12 dates: Jan 1, Feb 1, ...)
- Month-end prices (12 dates: Jan 31, Feb 28, ...)
- Total: 24 price points per symbol per year

### API Strategy

```javascript
// For year 2024
var startDate = new Date("2024-01-01");
var endDate = new Date("2024-12-31");

// Batched fetch (already optimized in existing code)
var historical = await fetchMultipleHistoricalBatched(symbols, startDate, endDate);

// Extract month boundaries from results
```

### Caching

- **Past years (2020-2024):** Aggressive caching (prices stable)
- **Current year (2025):** Refresh on each load (prices change daily)
- Leverage existing `prices.csv` cache
- Only fetch missing date ranges

### Performance

- Initial load: Calculate current year only (lazy-load on tap)
- ~240 price lookups per year (batched into ~10 API requests)
- Target load time: <3 seconds

## Error Handling

### Offline Mode

- Fall back to cached prices from `prices.csv`
- Show stale data warning if cache >7 days old
- Interpolate missing dates from nearest available prices

### Edge Cases Handled

1. **Pre-2020 years:** Exclude from cycle (no transactions)
2. **Partial first month:** Use first transaction date as boundary
3. **Missing historical data:** Use closest available price or show "N/A"
4. **Negative total P/L:** Display with red color, negative averages
5. **Zero months:** Show flat baseline chart
6. **All errors:** Show "N/A" with error message

## Testing Strategy

### Key Scenarios

1. **Current year (2025):**
   - Jan-Feb have data, Mar-Dec show €0
   - Total = sum of monthly P/L
   - Average = total ÷ 2

2. **Full past year (2024):**
   - All 12 months populated
   - Verify against known values

3. **First year (2020):**
   - Only Mar-Dec (started Mar 10)
   - Jan-Feb show €0

4. **Year cycling:**
   - Tap through all years, verify wrap-around
   - State persists on reload

5. **Offline mode:**
   - Disable network, verify cache fallback

6. **Visual validation:**
   - Green bars for gains, red for losses
   - Stock list colors match P/L signs
   - Layout fits 10 stocks without scrolling

7. **Stock attribution:**
   - Sum of stock P/L = total P/L
   - Percentages sum to ~100%

### Testing Phases

1. **Development mode:** Console logging, calculation verification
2. **Device testing:** Tap interaction, performance, layout

## Implementation Notes

- Dual environment support (development/production paths)
- Reuse existing color/formatting patterns
- Follow ES6 source → stripped dist pattern
- Test both environments before deployment

## Success Criteria

- Displays monthly P/L trend for selected year
- Accurate calculations matching existing widget's methodology
- Smooth tap interaction with state persistence
- All 10 stocks visible with correct attribution
- <3 second load time
- Graceful offline fallback
