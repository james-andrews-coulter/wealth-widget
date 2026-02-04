# Monthly Income Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a second Scriptable widget that visualizes monthly passive income (unrealized P/L) from investment portfolio with per-stock attribution.

**Architecture:** Reuses existing modular architecture with shared lib modules. New income-widget.js entry point. Adds calculation functions for monthly P/L, bar chart renderer, and state persistence. Build system extended to support dual-widget compilation.

**Tech Stack:** JavaScript (ES5-compatible for Scriptable), Scriptable iOS framework, Yahoo Finance API (existing), CSV data storage

---

## Task 1: Extend Build System for Dual Widgets

**Files:**
- Modify: `build.js:1-56`
- Modify: `package.json:6-8`

**Step 1: Update build.js to support multiple targets**

Replace the entire build.js with:

```javascript
// Simple concatenation build for Scriptable compatibility
const fs = require('fs');
const path = require('path');

// Shared library modules (in dependency order)
const libModules = [
  'lib/config.js',
  'lib/formatters.js',
  'lib/data-loader.js',
  'lib/api-client.js',
  'lib/calculations.js',
  'lib/chart-renderer.js',
  'lib/ui-components.js'
];

// Widget definitions
const widgets = [
  {
    name: 'Wealth Widget',
    entry: 'widget.js',
    output: 'dist/widget.js'
  },
  {
    name: 'Income Widget',
    entry: 'income-widget.js',
    output: 'dist/income-widget.js'
  }
];

function buildWidget(widgetDef) {
  console.log(`\nBuilding ${widgetDef.name}...`);

  let output = `// ${widgetDef.name} - Built ${new Date().toISOString()}\n`;
  output += '// Auto-generated - Do not edit directly. Edit source files in src/\n\n';

  // Concatenate lib modules
  libModules.forEach(modulePath => {
    const fullPath = path.join('src', modulePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Warning: ${modulePath} not found, skipping...`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const stripped = stripES6Syntax(content);

    output += `// === ${modulePath} ===\n`;
    output += stripped;
    output += '\n\n';

    console.log(`  ✓ Included ${modulePath}`);
  });

  // Concatenate entry point
  const entryPath = path.join('src', widgetDef.entry);

  if (!fs.existsSync(entryPath)) {
    console.error(`❌ Error: Entry point ${widgetDef.entry} not found`);
    process.exit(1);
  }

  const entryContent = fs.readFileSync(entryPath, 'utf8');
  const strippedEntry = stripES6Syntax(entryContent);

  output += `// === ${widgetDef.entry} ===\n`;
  output += strippedEntry;
  output += '\n';

  console.log(`  ✓ Included ${widgetDef.entry}`);

  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Write output
  fs.writeFileSync(widgetDef.output, output, 'utf8');

  const sizeKB = (fs.statSync(widgetDef.output).size / 1024).toFixed(2);
  console.log(`  ✅ Build complete: ${widgetDef.output} (${sizeKB} KB)`);
}

function stripES6Syntax(content) {
  return content
    .replace(/export\s+(const|function|class|let|var)/g, '$1')
    .replace(/import\s+.+from.+;?\n/g, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s*\{[^}]+\};?\n/g, '');
}

// Build all widgets
console.log('Building Scriptable Widgets...');

widgets.forEach(buildWidget);

console.log('\n📱 Copy files from dist/ to Scriptable app to deploy\n');
```

**Step 2: Add income-widget build script to package.json**

Update the scripts section:

```json
"scripts": {
  "build": "node build.js",
  "build:wealth": "node build.js",
  "build:income": "node build.js",
  "watch": "nodemon --watch src -e js --exec npm run build"
}
```

**Step 3: Test the build system**

Run: `npm run build`

Expected output:
```
Building Scriptable Widgets...

Building Wealth Widget...
  ✓ Included lib/config.js
  ✓ Included lib/formatters.js
  ...
  ✓ Included widget.js
  ✅ Build complete: dist/widget.js (XX.XX KB)

Building Income Widget...
  ❌ Error: Entry point income-widget.js not found
```

This is expected - we'll create income-widget.js next.

**Step 4: Commit**

```bash
git add build.js package.json
git commit -m "feat: extend build system to support multiple widgets

- Refactor build.js to support multiple widget targets
- Add income-widget build configuration
- Both widgets share same lib modules

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add State Persistence Functions

**Files:**
- Modify: `src/lib/data-loader.js:1-end`

**Step 1: Add state file reading function**

Add these functions at the end of data-loader.js, before the export statement:

```javascript
// Read income widget state (year offset)
async function readIncomeWidgetState() {
  try {
    const fm = getFileManager();
    const dataPath = getDataPath();
    const statePath = fm.joinPath(dataPath, "income-widget-state.json");

    if (!fm.fileExists(statePath)) {
      return { yearOffset: 0 };
    }

    const content = fm.readString(statePath);
    const state = JSON.parse(content);
    return state;
  } catch (error) {
    console.error("Error reading income widget state:", error);
    return { yearOffset: 0 };
  }
}

// Write income widget state (year offset)
async function writeIncomeWidgetState(state) {
  try {
    const fm = getFileManager();
    const dataPath = getDataPath();
    const statePath = fm.joinPath(dataPath, "income-widget-state.json");

    const content = JSON.stringify(state, null, 2);
    fm.writeString(statePath, content);
  } catch (error) {
    console.error("Error writing income widget state:", error);
  }
}
```

**Step 2: Update export statement**

Find the export statement at the end of data-loader.js and add the new functions:

```javascript
export {
  ensureDataDirectory,
  readTransactions,
  readHoldings,
  readPrices,
  appendPrices,
  getLatestPrice,
  readIncomeWidgetState,
  writeIncomeWidgetState
};
```

**Step 3: Build and verify**

Run: `npm run build`

Expected: Build succeeds for widget.js (income-widget.js still missing, expected error)

**Step 4: Commit**

```bash
git add src/lib/data-loader.js
git commit -m "feat: add state persistence for income widget

- Add readIncomeWidgetState() to load year offset
- Add writeIncomeWidgetState() to persist year offset
- State stored in data/income-widget-state.json

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Monthly P/L Calculation Functions

**Files:**
- Modify: `src/lib/calculations.js:240-247`

**Step 1: Add helper to get years from transactions**

Add this function before the export statement:

```javascript
// Get list of years that have transaction data
function getYearsFromTransactions(transactions) {
  var years = {};
  for (var i = 0; i < transactions.length; i++) {
    var year = parseInt(transactions[i].date.substring(0, 4));
    years[year] = true;
  }
  var yearList = Object.keys(years).map(function(y) { return parseInt(y); });
  yearList.sort(function(a, b) { return a - b; });
  return yearList;
}
```

**Step 2: Add monthly P/L calculation function**

Add this function after getYearsFromTransactions:

```javascript
// Calculate monthly P/L for a given year
async function calculateMonthlyPL(year, allHistoricalPrices, eurRates) {
  var transactions = await readTransactions();
  if (transactions.length === 0) return [];

  var monthlyPL = [];

  // Process each month (1-12)
  for (var month = 1; month <= 12; month++) {
    var monthStart = new Date(year, month - 1, 1);
    var monthEnd = new Date(year, month, 0); // Last day of month
    var monthStartStr = monthStart.toISOString().split("T")[0];
    var monthEndStr = monthEnd.toISOString().split("T")[0];

    // Check if this month is in the future
    var today = new Date();
    if (monthStart > today) {
      monthlyPL.push({ month: month, value: 0, hasData: false });
      continue;
    }

    // Calculate holdings and cost at month boundaries
    var holdingsAtStart = {};
    var costAtStart = {};
    var holdingsAtEnd = {};
    var costAtEnd = {};

    for (var t = 0; t < transactions.length; t++) {
      var txDate = transactions[t].date;
      var sym = transactions[t].symbol;

      if (txDate <= monthStartStr) {
        if (!holdingsAtStart[sym]) {
          holdingsAtStart[sym] = 0;
          costAtStart[sym] = 0;
        }
        holdingsAtStart[sym] += transactions[t].quantity;
        costAtStart[sym] += transactions[t].quantity * transactions[t].price;
      }

      if (txDate <= monthEndStr) {
        if (!holdingsAtEnd[sym]) {
          holdingsAtEnd[sym] = 0;
          costAtEnd[sym] = 0;
        }
        holdingsAtEnd[sym] += transactions[t].quantity;
        costAtEnd[sym] += transactions[t].quantity * transactions[t].price;
      }
    }

    // Calculate portfolio values at boundaries
    var valueAtStart = 0;
    var totalCostAtStart = 0;
    var valueAtEnd = 0;
    var totalCostAtEnd = 0;
    var hasData = false;

    // Start of month
    for (var sym in holdingsAtStart) {
      if (holdingsAtStart[sym] <= 0) continue;

      var histData = allHistoricalPrices[sym];
      if (!histData || histData.length === 0) continue;

      var closestPrice = null;
      for (var k = 0; k < histData.length; k++) {
        var histDate = new Date(histData[k].date);
        if (histDate <= monthStart) closestPrice = histData[k].price;
      }

      if (closestPrice !== null) {
        var eurRate = eurRates["USD"] || 1;
        valueAtStart += holdingsAtStart[sym] * closestPrice * eurRate;
        totalCostAtStart += costAtStart[sym] * eurRate;
        hasData = true;
      }
    }

    // End of month
    for (var sym in holdingsAtEnd) {
      if (holdingsAtEnd[sym] <= 0) continue;

      var histData = allHistoricalPrices[sym];
      if (!histData || histData.length === 0) continue;

      var closestPrice = null;
      for (var k = 0; k < histData.length; k++) {
        var histDate = new Date(histData[k].date);
        if (histDate <= monthEnd) closestPrice = histData[k].price;
      }

      if (closestPrice !== null) {
        var eurRate = eurRates["USD"] || 1;
        valueAtEnd += holdingsAtEnd[sym] * closestPrice * eurRate;
        totalCostAtEnd += costAtEnd[sym] * eurRate;
        hasData = true;
      }
    }

    // Calculate P/L (change in unrealized profit)
    var startPL = valueAtStart - totalCostAtStart;
    var endPL = valueAtEnd - totalCostAtEnd;
    var monthPL = endPL - startPL;

    monthlyPL.push({
      month: month,
      value: hasData ? monthPL : 0,
      hasData: hasData
    });
  }

  return monthlyPL;
}
```

**Step 3: Add stock attribution calculation function**

Add this function after calculateMonthlyPL:

```javascript
// Calculate per-stock attribution for a year
async function calculateStockAttribution(year, allHistoricalPrices, eurRates) {
  var transactions = await readTransactions();
  if (transactions.length === 0) return [];

  var holdings = await readHoldings();
  var stockYearlyPL = {};

  // Initialize all symbols
  for (var h = 0; h < holdings.length; h++) {
    stockYearlyPL[holdings[h].symbol] = 0;
  }

  // Calculate monthly P/L per stock for the entire year
  var yearStart = new Date(year, 0, 1);
  var yearEnd = new Date(year, 11, 31);
  var yearStartStr = yearStart.toISOString().split("T")[0];
  var yearEndStr = yearEnd.toISOString().split("T")[0];

  for (var sym in stockYearlyPL) {
    // Calculate holdings and cost at year boundaries
    var holdingsAtStart = 0;
    var costAtStart = 0;
    var holdingsAtEnd = 0;
    var costAtEnd = 0;

    for (var t = 0; t < transactions.length; t++) {
      if (transactions[t].symbol !== sym) continue;

      if (transactions[t].date <= yearStartStr) {
        holdingsAtStart += transactions[t].quantity;
        costAtStart += transactions[t].quantity * transactions[t].price;
      }

      if (transactions[t].date <= yearEndStr) {
        holdingsAtEnd += transactions[t].quantity;
        costAtEnd += transactions[t].quantity * transactions[t].price;
      }
    }

    // Get prices at boundaries
    var histData = allHistoricalPrices[sym];
    if (!histData || histData.length === 0) continue;

    var priceAtStart = null;
    var priceAtEnd = null;

    for (var k = 0; k < histData.length; k++) {
      var histDate = new Date(histData[k].date);
      if (histDate <= yearStart) priceAtStart = histData[k].price;
      if (histDate <= yearEnd) priceAtEnd = histData[k].price;
    }

    if (priceAtStart !== null && priceAtEnd !== null) {
      var eurRate = eurRates["USD"] || 1;

      var valueAtStart = holdingsAtStart * priceAtStart * eurRate;
      var totalCostAtStart = costAtStart * eurRate;
      var valueAtEnd = holdingsAtEnd * priceAtEnd * eurRate;
      var totalCostAtEnd = costAtEnd * eurRate;

      var startPL = valueAtStart - totalCostAtStart;
      var endPL = valueAtEnd - totalCostAtEnd;

      stockYearlyPL[sym] = endPL - startPL;
    }
  }

  // Convert to array and calculate percentages
  var totalPL = 0;
  for (var sym in stockYearlyPL) {
    totalPL += stockYearlyPL[sym];
  }

  var stockList = [];
  for (var sym in stockYearlyPL) {
    var pl = stockYearlyPL[sym];
    var pct = totalPL !== 0 ? (pl / totalPL) * 100 : 0;
    stockList.push({
      symbol: sym,
      yearlyPL: pl,
      percentage: pct
    });
  }

  // Sort by P/L descending
  stockList.sort(function(a, b) {
    return b.yearlyPL - a.yearlyPL;
  });

  return stockList;
}
```

**Step 4: Update export statement**

Update the export statement at the end:

```javascript
export {
  calculatePortfolio,
  calculateMTD1PL,
  calculateYTDPL,
  getFirstHoldingDate,
  getHistoricalPortfolioValues,
  getYearsFromTransactions,
  calculateMonthlyPL,
  calculateStockAttribution
};
```

**Step 5: Build and verify**

Run: `npm run build`

Expected: Build succeeds for widget.js

**Step 6: Commit**

```bash
git add src/lib/calculations.js
git commit -m "feat: add monthly P/L calculation functions

- Add getYearsFromTransactions() helper
- Add calculateMonthlyPL() for monthly unrealized P/L
- Add calculateStockAttribution() for per-stock yearly breakdown
- Calculations exclude capital additions/withdrawals

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Bar Chart Renderer

**Files:**
- Modify: `src/lib/chart-renderer.js:103-105`

**Step 1: Add color constants**

Add after the COLORS definition (if not already present, otherwise skip):

```javascript
const COLORS = {
  background: new Color("#000000"),
  textPrimary: new Color("#FFFFFF"),
  textSecondary: new Color("#8E8E93"),
  graphLine: new Color("#30D158"),
  graphLineNegative: new Color("#FF453A"),
  axisLine: new Color("#3A3A3C")
};
```

**Step 2: Add bar chart drawing function**

Add this function before the export statement:

```javascript
// Draw bar chart with gridlines for monthly P/L visualization
function drawBarChart(context, monthlyData, x, y, width, height, leftMargin, bottomMargin) {
  if (monthlyData.length !== 12) {
    console.error("drawBarChart expects 12 months of data");
    return;
  }

  var graphX = x + leftMargin;
  var graphWidth = width - leftMargin;
  var graphHeight = height - bottomMargin;

  // Find min and max values (include 0 in range)
  var values = monthlyData.map(function(d) { return d.value; });
  var maxVal = Math.max.apply(null, values);
  var minVal = Math.min.apply(null, values);

  // Ensure 0 is in the range
  maxVal = Math.max(maxVal, 0);
  minVal = Math.min(minVal, 0);

  // Add some padding to the range
  var range = maxVal - minVal || 1;
  maxVal = maxVal + range * 0.1;
  minVal = minVal - range * 0.1;
  range = maxVal - minVal;

  // Calculate gridline interval (round to nice numbers)
  var gridInterval = Math.pow(10, Math.floor(Math.log10(range / 4)));
  if (range / gridInterval > 8) gridInterval *= 2;
  if (range / gridInterval > 8) gridInterval *= 2.5;

  // Draw horizontal gridlines
  context.setStrokeColor(COLORS.axisLine);
  context.setLineWidth(0.5);
  context.setFont(Font.systemFont(8));
  context.setTextColor(COLORS.textSecondary);

  var gridValue = Math.ceil(minVal / gridInterval) * gridInterval;
  while (gridValue <= maxVal) {
    var gridY = y + graphHeight - ((gridValue - minVal) / range) * graphHeight;

    // Draw gridline
    var gridPath = new Path();
    gridPath.move(new Point(graphX, gridY));
    gridPath.addLine(new Point(graphX + graphWidth, gridY));
    context.addPath(gridPath);
    context.strokePath();

    // Draw Y-axis label
    var label = formatNumber(gridValue, false);
    context.drawText(label, new Point(x, gridY - 5));

    gridValue += gridInterval;
  }

  // Draw baseline (zero line) thicker
  if (minVal < 0 && maxVal > 0) {
    var zeroY = y + graphHeight - ((0 - minVal) / range) * graphHeight;
    context.setStrokeColor(COLORS.textSecondary);
    context.setLineWidth(1);
    var zeroPath = new Path();
    zeroPath.move(new Point(graphX, zeroY));
    zeroPath.addLine(new Point(graphX + graphWidth, zeroY));
    context.addPath(zeroPath);
    context.strokePath();
  }

  // Draw bars
  var barWidth = graphWidth / 12;
  var barSpacing = barWidth * 0.2;
  var actualBarWidth = barWidth - barSpacing;

  for (var i = 0; i < 12; i++) {
    var barX = graphX + i * barWidth + barSpacing / 2;
    var value = monthlyData[i].value;

    if (value === 0 || !monthlyData[i].hasData) continue;

    // All bars extend upward from baseline
    var baseline = y + graphHeight - ((0 - minVal) / range) * graphHeight;
    var barHeight = Math.abs((value / range) * graphHeight);
    var barY = baseline - barHeight;

    // Color based on positive/negative
    var barColor = value >= 0 ? COLORS.graphLine : COLORS.graphLineNegative;

    // Draw bar
    context.setFillColor(barColor);
    var barRect = new Rect(barX, barY, actualBarWidth, barHeight);
    context.fillRect(barRect);
  }

  // Draw month labels (J F M A M J J A S O N D)
  var monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  context.setFont(Font.systemFont(10));
  context.setTextColor(COLORS.textSecondary);

  for (var i = 0; i < 12; i++) {
    var labelX = graphX + i * barWidth + barWidth / 2 - 4;
    var labelY = y + graphHeight + 5;
    context.drawText(monthLabels[i], new Point(labelX, labelY));
  }
}
```

**Step 3: Update export statement**

```javascript
export { drawGraph, drawBarChart };
```

**Step 4: Build and verify**

Run: `npm run build`

Expected: Build succeeds for widget.js

**Step 5: Commit**

```bash
git add src/lib/chart-renderer.js
git commit -m "feat: add bar chart renderer for monthly P/L

- Add drawBarChart() with 12-month bar visualization
- Color-coded bars (green=gain, red=loss)
- Horizontal gridlines for precise reading
- All bars extend upward from baseline

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Income Widget UI Layout

**Files:**
- Modify: `src/lib/ui-components.js:1-end`

**Step 1: Add income widget layout function**

Add this function before the export statement:

```javascript
// Create large income widget layout
async function createIncomeLargeWidget(year, monthlyPL, stockAttribution, totalPL, avgPL) {
  var widget = new ListWidget();
  widget.backgroundColor = COLORS.background;
  widget.setPadding(16, 16, 16, 16);

  // Header: Total P/L
  var headerText = widget.addText(formatCurrency(totalPL));
  headerText.font = Font.boldSystemFont(32);
  headerText.textColor = totalPL >= 0 ? COLORS.graphLine : COLORS.graphLineNegative;

  widget.addSpacer(4);

  // Subtitle: Average · Year
  var subtitleStr = formatCurrency(avgPL) + "/mo · " + year;
  var subtitleText = widget.addText(subtitleStr);
  subtitleText.font = Font.systemFont(14);
  subtitleText.textColor = COLORS.textSecondary;

  widget.addSpacer(16);

  // Bar chart
  var chartHeight = 180;
  var chartWidth = 340;
  var chartImage = await drawBarChartImage(monthlyPL, chartWidth, chartHeight);
  var chartImgWidget = widget.addImage(chartImage);
  chartImgWidget.imageSize = new Size(chartWidth, chartHeight);

  widget.addSpacer(16);

  // Divider line
  var dividerStack = widget.addStack();
  dividerStack.layoutHorizontally();
  dividerStack.addSpacer();
  var divider = dividerStack.addText("─".repeat(40));
  divider.font = Font.systemFont(8);
  divider.textColor = COLORS.axisLine;
  dividerStack.addSpacer();

  widget.addSpacer(12);

  // Stock breakdown (10 rows)
  for (var i = 0; i < Math.min(10, stockAttribution.length); i++) {
    var stock = stockAttribution[i];
    var stockStack = widget.addStack();
    stockStack.layoutHorizontally();
    stockStack.centerAlignContent();

    // Symbol (left-aligned, 80px width)
    var symbolText = stockStack.addText(stock.symbol);
    symbolText.font = Font.systemFont(12);
    symbolText.textColor = COLORS.textPrimary;
    symbolText.minimumScaleFactor = 0.8;
    symbolText.lineLimit = 1;
    stockStack.addSpacer(8);

    // Spacer to push amount and % to the right
    stockStack.addSpacer();

    // Amount (right-aligned)
    var plStr = (stock.yearlyPL >= 0 ? "+" : "") + formatCurrency(stock.yearlyPL);
    var amountText = stockStack.addText(plStr);
    amountText.font = Font.systemFont(12);
    amountText.textColor = stock.yearlyPL >= 0 ? COLORS.graphLine : COLORS.graphLineNegative;
    amountText.rightAlignText();

    stockStack.addSpacer(12);

    // Percentage
    var pctStr = Math.round(stock.percentage) + "%";
    var pctText = stockStack.addText(pctStr);
    pctText.font = Font.systemFont(11);
    pctText.textColor = COLORS.textSecondary;
    pctText.rightAlignText();

    if (i < 9) widget.addSpacer(6);
  }

  // Add tap URL to trigger refresh with next year
  widget.url = "scriptable:///run/Income%20Widget?action=nextYear";

  return widget;
}

// Helper: Draw bar chart to image
async function drawBarChartImage(monthlyPL, width, height) {
  var canvas = new DrawContext();
  canvas.size = new Size(width, height);
  canvas.opaque = false;
  canvas.respectScreenScale = true;

  drawBarChart(canvas, monthlyPL, 0, 0, width, height, 40, 20);

  return canvas.getImage();
}
```

**Step 2: Update export statement**

Find the export statement and add the new function:

```javascript
export {
  createLargeWidget,
  showInteractiveMenu,
  createIncomeLargeWidget
};
```

**Step 3: Build and verify**

Run: `npm run build`

Expected: Build succeeds for widget.js

**Step 4: Commit**

```bash
git add src/lib/ui-components.js
git commit -m "feat: add income widget UI layout

- Add createIncomeLargeWidget() with header, chart, stock list
- Header shows total and average P/L for year
- Bar chart visualization with 12 months
- Stock breakdown with color-coded P/L

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Income Widget Entry Point

**Files:**
- Create: `src/income-widget.js`

**Step 1: Create income-widget.js**

Create the file with this content:

```javascript
// income-widget.js - Monthly Income Widget Entry Point
// Displays monthly P/L visualization with per-stock attribution

// ⚠️ DO NOT RUN THIS FILE DIRECTLY IN SCRIPTABLE
// This is a source file that requires building.
// Run: npm run build
// Then copy dist/income-widget.js to Scriptable

// Handle tap interaction for year cycling
async function handleYearCycle() {
  var state = await readIncomeWidgetState();
  var transactions = await readTransactions();
  var availableYears = getYearsFromTransactions(transactions);

  // Increment year offset (wrap around)
  state.yearOffset = (state.yearOffset + 1) % availableYears.length;

  await writeIncomeWidgetState(state);

  return state.yearOffset;
}

// Main function
async function main() {
  // Check if this is a tap interaction
  var isInteraction = args.queryParameters && args.queryParameters.action === "nextYear";

  if (isInteraction) {
    await handleYearCycle();
  }

  // Ensure data directory exists
  await ensureDataDirectory();

  // Read state to determine which year to display
  var state = await readIncomeWidgetState();
  var transactions = await readTransactions();
  var availableYears = getYearsFromTransactions(transactions);

  if (availableYears.length === 0) {
    // No transaction data
    var errorWidget = new ListWidget();
    errorWidget.backgroundColor = COLORS.background;
    var errorText = errorWidget.addText("No transaction data found");
    errorText.textColor = COLORS.textPrimary;
    errorText.font = Font.systemFont(14);
    Script.setWidget(errorWidget);
    Script.complete();
    return;
  }

  // Calculate which year to display
  var yearIndex = state.yearOffset % availableYears.length;
  var displayYear = availableYears[availableYears.length - 1 - yearIndex];

  // Get unique symbols
  var holdings = await readHoldings();
  var symbols = [];
  for (var i = 0; i < holdings.length; i++) {
    symbols.push(holdings[i].symbol);
  }

  // Fetch EUR exchange rates
  var currencies = ["USD", "GBP", "EUR"];
  var eurRates = await fetchMultipleEURRates(currencies);

  // Fetch historical prices for the entire year
  var startDate = new Date(displayYear, 0, 1);
  var endDate = new Date(displayYear, 11, 31);

  var allHistoricalPrices = await fetchMultipleHistoricalBatched(symbols, startDate);

  // Calculate monthly P/L
  var monthlyPL = await calculateMonthlyPL(displayYear, allHistoricalPrices, eurRates);

  // Calculate stock attribution
  var stockAttribution = await calculateStockAttribution(displayYear, allHistoricalPrices, eurRates);

  // Calculate total and average
  var totalPL = 0;
  var completedMonths = 0;
  for (var i = 0; i < monthlyPL.length; i++) {
    if (monthlyPL[i].hasData) {
      totalPL += monthlyPL[i].value;
      completedMonths++;
    }
  }

  var avgPL = completedMonths > 0 ? totalPL / completedMonths : 0;

  // Render widget
  if (config.runsInWidget) {
    var widget = await createIncomeLargeWidget(displayYear, monthlyPL, stockAttribution, totalPL, avgPL);
    Script.setWidget(widget);
  } else {
    // Development mode: show year and total
    console.log("Income Widget - Year: " + displayYear);
    console.log("Total P/L: " + formatCurrency(totalPL));
    console.log("Average P/L: " + formatCurrency(avgPL));
    console.log("Completed months: " + completedMonths);

    var widget = await createIncomeLargeWidget(displayYear, monthlyPL, stockAttribution, totalPL, avgPL);
    await widget.presentLarge();
  }

  Script.complete();
}

// Run main function
await main();
```

**Step 2: Build both widgets**

Run: `npm run build`

Expected output:
```
Building Scriptable Widgets...

Building Wealth Widget...
  ✓ Included lib/config.js
  ...
  ✅ Build complete: dist/widget.js (XX.XX KB)

Building Income Widget...
  ✓ Included lib/config.js
  ...
  ✅ Build complete: dist/income-widget.js (XX.XX KB)
```

**Step 3: Test build output**

Run: `ls -lh dist/`

Expected: Both widget.js and income-widget.js present

**Step 4: Commit**

```bash
git add src/income-widget.js
git commit -m "feat: create income widget entry point

- Add main() function with year cycling logic
- Handle tap interaction to cycle through years
- Fetch historical prices and calculate monthly P/L
- Render widget with createIncomeLargeWidget()
- Support both widget and development modes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Manual Testing & Refinement

**Files:**
- Test: `dist/income-widget.js`

**Step 1: Copy to Scriptable app**

1. Open `dist/income-widget.js` in your editor
2. Copy the entire file contents
3. Open Scriptable app on Mac or iPhone
4. Create new script named "Income Widget"
5. Paste the contents
6. Save

**Step 2: Test in development mode**

In Scriptable app:
1. Run the "Income Widget" script (don't add as widget yet)
2. Check console output for:
   - Year displayed (should be 2025)
   - Total P/L value
   - Average P/L value
   - Completed months count
3. Verify widget preview appears

Expected behavior:
- Shows large widget preview
- Header shows total P/L for 2025
- Subtitle shows average and "2025"
- Bar chart visible (Jan-Feb may have data, rest empty)
- Stock list shows 10 stocks

**Step 3: Test as widget on device**

If testing on iPhone:
1. Long-press home screen
2. Tap "+" to add widget
3. Find "Scriptable" in widget list
4. Choose "Large" widget
5. Configure to run "Income Widget" script
6. Add to home screen

**Step 4: Test year cycling**

1. Tap the widget
2. Verify it refreshes and shows 2024
3. Tap again → 2023
4. Continue tapping to verify: 2022 → 2021 → 2020 → 2025 (wrap-around)

**Step 5: Verify calculations**

Check a known year (e.g., 2024) and verify:
- Monthly P/L values look reasonable
- Stock attribution adds up to total
- Percentages are correct
- Colors match signs (green=positive, red=negative)

**Step 6: Document any issues**

If you find bugs or issues, document them:

```bash
# Create issue log if needed
echo "## Testing Issues" >> docs/testing-notes.md
echo "- [Issue description]" >> docs/testing-notes.md
```

**Step 7: Commit dist files**

Per CLAUDE.md, dist files should be committed for easy deployment:

```bash
git add dist/income-widget.js
git commit -m "build: add compiled income widget for deployment

Compiled output includes all lib modules + income-widget entry.
Ready to copy to Scriptable app.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Bug Fixes & Polish (If Needed)

**Files:**
- Various (based on testing feedback)

**Note:** This task is intentionally flexible. Based on testing results from Task 7, fix any issues discovered:

**Common issues to check:**
1. **Missing COLORS constant:** If COLORS is not defined in chart-renderer.js, add it
2. **EUR rate handling:** Verify multi-currency portfolios convert correctly
3. **Empty months display:** Ensure future months show as empty bars
4. **Year offset wrap:** Confirm cycling wraps correctly
5. **Performance:** If slow, check API batching is working

**Step 1: Fix any identified issues**

For each bug:
- Edit the relevant source file
- Run `npm run build`
- Test in Scriptable
- Commit the fix

**Step 2: Commit format**

```bash
git add [files]
git commit -m "fix: [description of fix]

[Details about what was wrong and how it's fixed]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update Documentation

**Files:**
- Modify: `CLAUDE.md:1-end`
- Modify: `README.md` (if exists)

**Step 1: Update CLAUDE.md build section**

Find the "Build Commands" section and update:

```markdown
### Build Commands

```bash
# Build both widgets
npm run build

# Build specific widget
npm run build:wealth
npm run build:income

# Watch mode for development
npm run watch
```

### Build Architecture

The build system (`build.js`) concatenates source modules in dependency order and strips ES6 module syntax for Scriptable compatibility.

**Widget outputs:**
- `dist/widget.js` - Portfolio wealth widget (existing)
- `dist/income-widget.js` - Monthly income widget (NEW)

Both widgets share the same lib modules but have different entry points.
```

**Step 2: Document income widget in CLAUDE.md**

Add a new section after "Project Overview":

```markdown
## Widgets

### 1. Wealth Widget (`widget.js`)
Portfolio overview with:
- Total value, day/MTD-1/YTD changes
- Holdings breakdown
- Historical value chart

### 2. Monthly Income Widget (`income-widget.js`)
Monthly passive income visualization with:
- Calendar year P/L bar chart
- Per-stock attribution breakdown
- Tap to cycle through historical years
- State persisted in `data/income-widget-state.json`

**State file:** `data/income-widget-state.json`
- Format: `{ "yearOffset": 0 }`
- Not committed to git (user-specific state)
```

**Step 3: Update .gitignore for state file**

Add state file to .gitignore:

```bash
# Add to .gitignore
echo "" >> .gitignore
echo "# Widget state (user-specific)" >> .gitignore
echo "data/income-widget-state.json" >> .gitignore
```

**Step 4: Commit documentation**

```bash
git add CLAUDE.md .gitignore
git commit -m "docs: update documentation for income widget

- Document dual-widget build system
- Add income widget overview
- Ignore income-widget-state.json (user state)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Final Verification & Cleanup

**Files:**
- All modified files

**Step 1: Run final build**

```bash
npm run build
```

Expected: Both widgets build successfully with no errors

**Step 2: Verify git status**

```bash
git status
```

Expected: Working directory clean (all changes committed)

**Step 3: Review commit history**

```bash
git log --oneline -10
```

Expected: Clean commit history with descriptive messages

**Step 4: Test both widgets side-by-side**

If possible, add both widgets to home screen and verify:
- Original wealth widget still works
- Income widget works independently
- Both read from same transaction data
- No conflicts or interference

**Step 5: Create summary of changes**

```bash
git diff main feature/monthly-income-widget --stat
```

Review files changed and ensure nothing unexpected

**Step 6: Ready for merge**

The feature is complete and tested. Use @superpowers:finishing-a-development-branch to merge back to main.

---

## Success Criteria

✅ Build system supports dual widgets
✅ Income widget displays monthly P/L bar chart
✅ Stock attribution breakdown shows all 10 holdings
✅ Tap interaction cycles through years (2025 → 2024 → ... → 2020 → 2025)
✅ State persists between widget refreshes
✅ Color coding works (green=gain, red=loss)
✅ Calculations match design spec (unrealized P/L excluding capital changes)
✅ Documentation updated
✅ All changes committed with clean history

## Notes

- Widget uses same data as wealth widget (transactions.csv, prices.csv)
- Historical price fetching leverages existing batched API calls
- Development mode shows console output for debugging
- Widget mode renders on home screen with tap interaction
- State file stores year offset but is not committed (user-specific)
