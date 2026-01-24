// Wealth Widget - Built 2026-01-24T14:57:33.203Z
// Auto-generated - Do not edit directly. Edit source files in src/

// === lib/config.js ===
// config.js - Environment detection and path resolution
// Enables git-ready development with iCloud production deployment

const CONFIG = {
  transactionsFileName: "transactions.csv",
  pricesFileName: "prices.csv",
  currencySymbol: "EUR",
  iCloudFolderName: "WealthWidget",
  gitRepoPath: "/Users/jamesalexander/wealth_widget/data"
};

// Detect if running in development (local) or production (widget)
function isDevelopment() {
  // When running as widget, config.runsInWidget is true
  // In development/testing, it's typically false or undefined
  return !config.runsInWidget;
}

// Get FileManager instance (iCloud or local)
function getFileManager() {
  if (isDevelopment()) {
    return FileManager.local();
  } else {
    return FileManager.iCloud();
  }
}

// Get data directory path based on environment
function getDataPath() {
  const fm = getFileManager();

  if (isDevelopment()) {
    // Development: Try local git repo, fall back to Scriptable documents
    try {
      // Check if git repo path exists and is accessible
      if (fm.fileExists(CONFIG.gitRepoPath)) {
        return CONFIG.gitRepoPath;
      }
    } catch (e) {
      // Path not accessible, fall through to Scriptable docs
    }

    // Fallback: Use Scriptable documents directory
    const docsDir = fm.documentsDirectory();
    return fm.joinPath(docsDir, CONFIG.iCloudFolderName);
  } else {
    // Production: Use iCloud
    const docsDir = fm.documentsDirectory();
    return fm.joinPath(docsDir, CONFIG.iCloudFolderName);
  }
}

// Get full path for transactions file
function getTransactionsPath() {
  const fm = getFileManager();
  const dataPath = getDataPath();
  return fm.joinPath(dataPath, CONFIG.transactionsFileName);
}

// Get full path for prices cache file
function getPricesPath() {
  const fm = getFileManager();
  const dataPath = getDataPath();
  return fm.joinPath(dataPath, CONFIG.pricesFileName);
}

// Ensure data directory exists
async function ensureDataDirectory() {
  const fm = getFileManager();
  const dataPath = getDataPath();

  try {
    if (!fm.fileExists(dataPath)) {
      fm.createDirectory(dataPath, true);
    }

    // Wait for iCloud sync if needed
    if (!isDevelopment() && !fm.isFileDownloaded(dataPath)) {
      await fm.downloadFileFromiCloud(dataPath);
    }
  } catch (e) {
    console.error("Could not ensure data directory: " + e);
    // Directory might already exist or we don't have permissions
    // Try to continue anyway
  }
}



// === lib/formatters.js ===
// formatters.js - Number formatting and color utilities
// Extracted from current Scriptable widget

// Color scheme with dynamic light/dark mode support
const COLORS = {
  bg: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
  text: Color.dynamic(Color.black(), Color.white()),
  textSecondary: Color.dynamic(new Color("#6B7280"), Color.gray()),
  green: new Color("#34C759"),
  red: new Color("#FF3B30"),
  graphLine: new Color("#34C759"),
  axisLine: Color.dynamic(new Color("#E5E5EA"), new Color("#3A3A3C"))
};

// Format number with K suffix for thousands, optional sign
function formatNumber(value, showSign) {
  if (value === null || value === undefined) return "N/A";

  var absValue = Math.abs(value);
  var sign = "";

  if (showSign && value >= 0) sign = "+";
  if (value < 0) sign = "-";

  var formatted;
  if (absValue >= 1000) {
    var k = absValue / 1000;
    if (k >= 100) {
      formatted = Math.round(k).toLocaleString("en-US") + "K";
    } else {
      formatted = k.toFixed(1).replace(/\.0$/, "") + "K";
    }
  } else {
    formatted = Math.round(absValue).toLocaleString("en-US");
  }

  return sign + formatted;
}

// Format percentage with optional sign
function formatPercent(value, showSign) {
  if (value === null || value === undefined) return "N/A";

  var sign = "";
  if (showSign && value >= 0) sign = "+";
  if (value < 0) sign = "-";

  return sign + Math.abs(value).toFixed(1) + "%";
}

// Pad string to left with spaces
function padLeft(str, len) {
  str = String(str);
  while (str.length < len) str = " " + str;
  return str;
}

// Pad string to right with spaces
function padRight(str, len) {
  str = String(str);
  while (str.length < len) str = str + " ";
  return str;
}

// Get color based on positive/negative value
function getChangeColor(value) {
  if (value === null || value === undefined) return COLORS.textSecondary;
  if (value > 0) return COLORS.green;
  if (value < 0) return COLORS.red;
  return COLORS.textSecondary;
}



// === lib/data-loader.js ===
// data-loader.js - CSV reading and writing with path resolution
// Adapted from current script lines 44-133, enhanced for git working

// Read transactions from CSV file
async function readTransactions() {
  const fm = getFileManager();
  const transactionsPath = getTransactionsPath();

  // Create file if it doesn't exist
  if (!fm.fileExists(transactionsPath)) {
    fm.writeString(transactionsPath, "symbol,quantity,price,date\n");
    return [];
  }

  // Download from iCloud if needed
  if (!isDevelopment() && !fm.isFileDownloaded(transactionsPath)) {
    await fm.downloadFileFromiCloud(transactionsPath);
  }

  const csvContent = fm.readString(transactionsPath);
  const lines = csvContent.trim().split("\n");
  const transactions = [];

  // Parse CSV (skip header row)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const parts = line.split(",");
    if (parts.length >= 4) {
      transactions.push({
        symbol: parts[0].trim().toUpperCase(),
        quantity: parseFloat(parts[1].trim()),
        price: parseFloat(parts[2].trim()),
        date: parts[3].trim()
      });
    }
  }

  return transactions;
}

// Read holdings (aggregated from transactions)
async function readHoldings() {
  const transactions = await readTransactions();
  const holdingsMap = {};

  for (const tx of transactions) {
    if (!holdingsMap[tx.symbol]) {
      holdingsMap[tx.symbol] = {
        symbol: tx.symbol,
        quantity: 0,
        totalCost: 0,
        purchaseDate: tx.date
      };
    }

    holdingsMap[tx.symbol].quantity += tx.quantity;
    holdingsMap[tx.symbol].totalCost += tx.quantity * tx.price;

    // Track earliest purchase date
    if (tx.date < holdingsMap[tx.symbol].purchaseDate) {
      holdingsMap[tx.symbol].purchaseDate = tx.date;
    }
  }

  const holdings = [];
  for (const sym in holdingsMap) {
    const h = holdingsMap[sym];

    // Only include holdings with positive quantity
    if (h.quantity > 0) {
      holdings.push({
        symbol: h.symbol,
        quantity: h.quantity,
        purchasePrice: h.totalCost / h.quantity,
        purchaseDate: h.purchaseDate
      });
    }
  }

  return holdings;
}

// Write new transaction to CSV
function writeTransaction(symbol, quantity, price, date) {
  const fm = getFileManager();
  const transactionsPath = getTransactionsPath();

  let content = "";
  if (!fm.fileExists(transactionsPath)) {
    content = "symbol,quantity,price,date\n";
  } else {
    content = fm.readString(transactionsPath);
  }

  content += symbol.toUpperCase() + "," + quantity + "," + price + "," + date + "\n";
  fm.writeString(transactionsPath, content);
}

// Read prices from CSV cache
async function readPrices() {
  const fm = getFileManager();
  const pricesPath = getPricesPath();

  if (!fm.fileExists(pricesPath)) {
    return {};
  }

  // Download from iCloud if needed
  if (!isDevelopment() && !fm.isFileDownloaded(pricesPath)) {
    await fm.downloadFileFromiCloud(pricesPath);
  }

  const csvContent = fm.readString(pricesPath);
  const lines = csvContent.trim().split("\n");
  const priceMap = {};

  // Parse CSV (skip header row)
  // Format: ticker,date,price
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const parts = line.split(",");
    if (parts.length >= 3) {
      const ticker = parts[0].trim().toUpperCase();
      const date = parts[1].trim();
      const price = parseFloat(parts[2].trim());

      if (!priceMap[ticker]) {
        priceMap[ticker] = [];
      }

      priceMap[ticker].push({ date: date, price: price });
    }
  }

  // Sort price arrays by date
  for (const ticker in priceMap) {
    priceMap[ticker].sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });
  }

  return priceMap;
}

// Append new prices to CSV cache
async function appendPrices(newPrices) {
  // newPrices = [{ticker, date, price}, ...]
  const fm = getFileManager();
  const pricesPath = getPricesPath();

  let content = "";
  if (!fm.fileExists(pricesPath)) {
    content = "ticker,date,price\n";
  } else {
    content = fm.readString(pricesPath);
  }

  for (const p of newPrices) {
    content += `${p.ticker},${p.date},${p.price}\n`;
  }

  fm.writeString(pricesPath, content);
}

// Get latest price for a ticker from cache
function getLatestPrice(priceMap, ticker) {
  if (!priceMap[ticker] || priceMap[ticker].length === 0) {
    return null;
  }

  // Prices are sorted by date, so last one is latest
  return priceMap[ticker][priceMap[ticker].length - 1].price;
}

// Get price on specific date (or closest before)
function getPriceOnDate(priceMap, ticker, targetDate) {
  if (!priceMap[ticker] || priceMap[ticker].length === 0) {
    return null;
  }

  const target = new Date(targetDate);
  let closestPrice = null;

  for (const priceData of priceMap[ticker]) {
    const priceDate = new Date(priceData.date);
    if (priceDate <= target) {
      closestPrice = priceData.price;
    } else {
      break; // Prices are sorted, no need to check further
    }
  }

  return closestPrice;
}



// === lib/api-client.js ===
// api-client.js - Yahoo Finance API integration with batching
// Extracted from current script lines 174-248, optimized for performance

// Fetch current price for a single stock
async function fetchStockPrice(symbol) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1d";

  try {
    const request = new Request(url);
    request.headers = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" };
    const response = await request.loadJSON();

    if (response.chart && response.chart.result && response.chart.result[0]) {
      const meta = response.chart.result[0].meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose || meta.chartPreviousClose;

      return {
        symbol: symbol,
        price: currentPrice,
        previousClose: previousClose,
        change: currentPrice - previousClose,
        currency: meta.currency || "USD",
        marketState: meta.marketState,
        error: false
      };
    }

    throw new Error("Invalid response");
  } catch (error) {
    return { symbol: symbol, price: null, error: true };
  }
}

// Fetch historical data for a symbol from start date to now
async function fetchHistoricalData(symbol, startDate) {
  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(Date.now() / 1000);
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?period1=" + start + "&period2=" + end + "&interval=1d";

  try {
    const request = new Request(url);
    request.headers = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" };
    const response = await request.loadJSON();

    if (response.chart && response.chart.result && response.chart.result[0]) {
      const result = response.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators.quote[0].close || [];
      const data = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null) {
          data.push({
            date: new Date(timestamps[i] * 1000),
            price: closes[i]
          });
        }
      }

      return data;
    }

    return [];
  } catch (error) {
    return [];
  }
}

// Fetch EUR exchange rate for a currency
async function getEURRate(currency) {
  if (currency === "EUR") return 1;

  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + currency + "EUR=X?interval=1d&range=1d";

  try {
    const request = new Request(url);
    request.headers = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" };
    const response = await request.loadJSON();

    if (response.chart && response.chart.result && response.chart.result[0]) {
      return response.chart.result[0].meta.regularMarketPrice;
    }

    return 1;
  } catch (error) {
    return 1;
  }
}

// ⚡ PERFORMANCE OPTIMIZATION: Batch multiple stock price fetches
async function fetchMultipleStockPricesBatched(symbols) {
  // Execute all fetches in parallel using Promise.all
  const results = await Promise.all(symbols.map(function(s) { return fetchStockPrice(s); }));

  // Convert array to map for easier lookup
  const priceMap = {};
  for (let i = 0; i < results.length; i++) {
    priceMap[results[i].symbol] = results[i];
  }

  return priceMap;
}

// ⚡ PERFORMANCE OPTIMIZATION: Batch historical data fetches
async function fetchMultipleHistoricalBatched(symbols, startDate) {
  // Execute all fetches in parallel using Promise.all
  const results = await Promise.all(
    symbols.map(function(s) { return fetchHistoricalData(s, startDate); })
  );

  // Convert array to map {symbol: [priceData]}
  const historicalMap = {};
  for (let i = 0; i < symbols.length; i++) {
    historicalMap[symbols[i]] = results[i];
  }

  return historicalMap;
}

// Fetch EUR rates for multiple currencies in batch
async function fetchMultipleEURRates(currencies) {
  const results = await Promise.all(
    currencies.map(function(c) { return getEURRate(c); })
  );

  const rateMap = {};
  for (let i = 0; i < currencies.length; i++) {
    rateMap[currencies[i]] = results[i];
  }

  return rateMap;
}



// === lib/calculations.js ===
// calculations.js - Portfolio math and P/L calculations
// Extracted from current script lines 250-288, 382-412

// Calculate portfolio metrics from holdings and current prices
function calculatePortfolio(holdings, prices, eurRates) {
  let totalValue = 0, totalCost = 0, totalDayChange = 0;

  const enrichedHoldings = holdings.map(function(holding) {
    const priceData = prices[holding.symbol];

    if (!priceData || priceData.error) {
      return {
        symbol: holding.symbol,
        quantity: holding.quantity,
        valueEUR: null,
        dayChangeEUR: null,
        profitLossEUR: null,
        profitLossPct: null,
        portfolioPct: null,
        error: true
      };
    }

    const eurRate = eurRates[priceData.currency] || 1;
    const priceEUR = priceData.price * eurRate;
    const previousCloseEUR = priceData.previousClose * eurRate;
    const valueEUR = holding.quantity * priceEUR;
    const dayChangeEUR = holding.quantity * (priceEUR - previousCloseEUR);
    const costEUR = holding.purchasePrice ? holding.quantity * holding.purchasePrice : null;
    const profitLossEUR = costEUR ? valueEUR - costEUR : null;
    const profitLossPct = costEUR ? ((valueEUR - costEUR) / costEUR) * 100 : null;

    totalValue += valueEUR;
    totalDayChange += dayChangeEUR;
    if (costEUR) totalCost += costEUR;

    // Calculate holding time in years
    var holdTimeYears = holding.purchaseDate ? (Date.now() - new Date(holding.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25) : null;

    // Calculate annualized yield
    var annualizedYield = (costEUR && holdTimeYears && holdTimeYears > 0) ? (Math.pow(valueEUR / costEUR, 1 / holdTimeYears) - 1) * 100 : null;

    return {
      symbol: holding.symbol,
      quantity: holding.quantity,
      valueEUR: valueEUR,
      dayChangeEUR: dayChangeEUR,
      profitLossEUR: profitLossEUR,
      profitLossPct: profitLossPct,
      holdTimeYears: holdTimeYears,
      annualizedYield: annualizedYield,
      marketState: priceData.marketState
    };
  });

  // Calculate portfolio percentage for each holding
  for (var i = 0; i < enrichedHoldings.length; i++) {
    if (enrichedHoldings[i].valueEUR !== null && totalValue > 0) {
      enrichedHoldings[i].portfolioPct = (enrichedHoldings[i].valueEUR / totalValue) * 100;
    } else {
      enrichedHoldings[i].portfolioPct = null;
    }
  }

  // Sort by portfolio percentage descending
  enrichedHoldings.sort(function(a, b) {
    if (a.portfolioPct === null) return 1;
    if (b.portfolioPct === null) return -1;
    return b.portfolioPct - a.portfolioPct;
  });

  return {
    holdings: enrichedHoldings,
    totalValueEUR: totalValue,
    totalCostEUR: totalCost,
    totalDayChangeEUR: totalDayChange,
    totalProfitLossEUR: totalCost > 0 ? totalValue - totalCost : null
  };
}

// Calculate MTD-1 (last month) P/L from historical values
function calculateMTD1PL(historicalValues) {
  if (historicalValues.length < 2) return null;

  var now = new Date();
  var lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  var lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var lastMonthEndStr = lastMonthEnd.toISOString().split("T")[0];
  var lastMonthStartStr = lastMonthStart.toISOString().split("T")[0];

  var startValue = null, endValue = null;
  for (var i = 0; i < historicalValues.length; i++) {
    if (historicalValues[i].date <= lastMonthStartStr) startValue = historicalValues[i].value;
    if (historicalValues[i].date <= lastMonthEndStr) endValue = historicalValues[i].value;
  }

  if (startValue === null || endValue === null) return null;
  return endValue - startValue;
}

// Calculate YTD (year-to-date) P/L from historical values
function calculateYTDPL(historicalValues) {
  if (historicalValues.length < 2) return null;

  var now = new Date();
  var yearStart = new Date(now.getFullYear(), 0, 1);
  var yearStartStr = yearStart.toISOString().split("T")[0];

  var startValue = null;
  for (var i = 0; i < historicalValues.length; i++) {
    if (historicalValues[i].date <= yearStartStr) startValue = historicalValues[i].value;
  }

  var endValue = historicalValues[historicalValues.length - 1].value;
  if (startValue === null) startValue = historicalValues[0].value;

  return endValue - startValue;
}

// Get first holding date from holdings list
function getFirstHoldingDate(holdings) {
  let firstDate = new Date();
  for (const holding of holdings) {
    if (holding.purchaseDate) {
      const date = new Date(holding.purchaseDate);
      if (date < firstDate) firstDate = date;
    }
  }
  return firstDate;
}

// Build historical portfolio values with monthly sampling (lighter widget)
async function getHistoricalPortfolioValues(holdings, eurRates, currentPortfolioValue) {
  var transactions = await readTransactions();
  if (transactions.length === 0) return [];

  // Sort transactions by date
  transactions.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  var firstDate = new Date(transactions[0].date);

  // Fetch historical prices for all symbols (BATCHED for performance)
  var symbols = [];
  for (var h = 0; h < holdings.length; h++) {
    if (symbols.indexOf(holdings[h].symbol) === -1) {
      symbols.push(holdings[h].symbol);
    }
  }

  // ⚡ PERFORMANCE: Batch fetch instead of sequential
  var allHistorical = await fetchMultipleHistoricalBatched(symbols, firstDate);

  var portfolioValues = [];
  var today = new Date();
  var totalDays = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));

  // Use monthly sampling for all data points (lighter widget)
  var currentDate = new Date(firstDate);
  var interval = 30; // Monthly sampling

  while (currentDate <= today) {
    var dateStr = currentDate.toISOString().split("T")[0];

    // Calculate portfolio value at this date
    var holdingsAtDate = {};
    for (var t = 0; t < transactions.length; t++) {
      if (transactions[t].date <= dateStr) {
        var sym = transactions[t].symbol;
        if (!holdingsAtDate[sym]) holdingsAtDate[sym] = 0;
        holdingsAtDate[sym] += transactions[t].quantity;
      }
    }

    var dayValue = 0;
    var hasData = false;
    for (var sym in holdingsAtDate) {
      var histData = allHistorical[sym];
      if (!histData || histData.length === 0) continue;

      var closestPrice = null;
      for (var k = 0; k < histData.length; k++) {
        if (histData[k].date <= currentDate) closestPrice = histData[k].price;
      }

      if (closestPrice !== null) {
        var eurRate = eurRates["USD"] || 1; // Assuming USD for simplicity
        dayValue += holdingsAtDate[sym] * closestPrice * eurRate;
        hasData = true;
      }
    }

    if (hasData) portfolioValues.push({ date: dateStr, value: dayValue });

    // Advance by interval
    currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000);
  }

  // FIX: Always add today's current portfolio value as the final data point
  // This ensures YTD, MTD-1, and other metrics use up-to-date values
  var todayStr = today.toISOString().split("T")[0];
  var hasTodayValue = false;

  for (var i = 0; i < portfolioValues.length; i++) {
    if (portfolioValues[i].date === todayStr) {
      // Update with current value if we already have today
      portfolioValues[i].value = currentPortfolioValue;
      hasTodayValue = true;
      break;
    }
  }

  if (!hasTodayValue && currentPortfolioValue !== null && currentPortfolioValue !== undefined) {
    portfolioValues.push({ date: todayStr, value: currentPortfolioValue });
  }

  return portfolioValues;
}



// === lib/chart-renderer.js ===
// chart-renderer.js - Canvas-based line chart drawing
// Extracted from current script lines 454-515

// Draw line chart with axes and labels
function drawGraph(context, data, x, y, width, height, leftMargin, bottomMargin) {
  if (data.length < 2) return;

  var graphX = x + leftMargin;
  var graphWidth = width - leftMargin;
  var graphHeight = height - bottomMargin;

  var values = data.map(function(d) { return d.value; });
  var minVal = Math.min.apply(null, values);
  var maxVal = Math.max.apply(null, values);
  var range = maxVal - minVal || 1;

  // Draw Y-axis labels
  context.setFont(Font.systemFont(8));
  context.setTextColor(COLORS.textSecondary);
  var maxLabel = formatNumber(maxVal, false);
  var minLabel = formatNumber(minVal, false);
  context.drawText(maxLabel, new Point(x, y));
  context.drawText(minLabel, new Point(x, y + graphHeight - 10));

  // Draw axis line
  context.setStrokeColor(COLORS.axisLine);
  context.setLineWidth(1);
  var axisPath = new Path();
  axisPath.move(new Point(graphX, y + graphHeight));
  axisPath.addLine(new Point(graphX + graphWidth, y + graphHeight));
  context.addPath(axisPath);
  context.strokePath();

  // Draw year ticks on X-axis with smart spacing
  var years = {};
  var yearList = [];
  for (var i = 0; i < data.length; i++) {
    var yr = data[i].date.substring(0, 4);
    if (!years[yr]) {
      years[yr] = i;
      yearList.push(parseInt(yr));
    }
  }

  // Sort years chronologically
  yearList.sort(function(a, b) { return a - b; });

  // Smart tick spacing: calculate optimal interval based on range
  var yearSpan = yearList.length;
  var tickInterval = 1;
  var maxTicks = 6; // Maximum number of ticks to show

  if (yearSpan > maxTicks) {
    // Calculate interval to keep ticks under max
    tickInterval = Math.ceil(yearSpan / maxTicks);
  }

  // Select which years to display
  var displayYears = [];
  for (var i = 0; i < yearList.length; i += tickInterval) {
    displayYears.push(yearList[i]);
  }

  // Always include the last year if not already included
  var lastYear = yearList[yearList.length - 1];
  if (displayYears.indexOf(lastYear) === -1) {
    displayYears.push(lastYear);
  }

  context.setFont(Font.systemFont(6));
  for (var i = 0; i < displayYears.length; i++) {
    var yr = displayYears[i].toString();
    var idx = years[yr];
    var tickX = graphX + (idx / (data.length - 1)) * graphWidth;
    context.drawText(yr, new Point(tickX - 8, y + graphHeight + 2));

    var tickPath = new Path();
    tickPath.move(new Point(tickX, y + graphHeight));
    tickPath.addLine(new Point(tickX, y + graphHeight + 3));
    context.addPath(tickPath);
    context.strokePath();
  }

  // Draw graph line
  var path = new Path();
  var stepX = graphWidth / (data.length - 1);

  for (var i = 0; i < data.length; i++) {
    var px = graphX + i * stepX;
    var py = y + graphHeight - ((data[i].value - minVal) / range) * graphHeight;

    if (i === 0) {
      path.move(new Point(px, py));
    } else {
      path.addLine(new Point(px, py));
    }
  }

  context.setStrokeColor(COLORS.graphLine);
  context.setLineWidth(2);
  context.addPath(path);
  context.strokePath();
}



// === lib/ui-components.js ===
// ui-components.js - Widget layouts and UI rendering
// Extracted and adapted from current script lines 518-721

// Create large widget with portfolio display
async function createLargeWidget(portfolio, historicalValues) {
  var widget = new ListWidget();
  widget.backgroundColor = COLORS.bg;
  widget.setPadding(16, 8, 16, 8);

  // Header
  var header = widget.addStack();
  header.layoutHorizontally();
  var title = header.addText("Portfolio");
  title.font = Font.boldSystemFont(16);
  title.textColor = COLORS.text;
  header.addSpacer();
  var totalVal = header.addText(formatNumber(portfolio.totalValueEUR, false));
  totalVal.font = Font.boldSystemFont(16);
  totalVal.textColor = COLORS.text;

  widget.addSpacer(8);

  // P/L Summary Row
  var plRow = widget.addStack();
  plRow.layoutHorizontally();

  // Daily
  var dailyStack = plRow.addStack();
  dailyStack.layoutVertically();
  var dailyLbl = dailyStack.addText("Day");
  dailyLbl.font = Font.systemFont(9);
  dailyLbl.textColor = COLORS.textSecondary;
  var dailyVal = dailyStack.addText(formatNumber(portfolio.totalDayChangeEUR, true));
  dailyVal.font = Font.boldSystemFont(11);
  dailyVal.textColor = getChangeColor(portfolio.totalDayChangeEUR);

  plRow.addSpacer();

  // Month (MTD-1)
  var monthStack = plRow.addStack();
  monthStack.layoutVertically();
  var monthLbl = monthStack.addText("MTD-1");
  monthLbl.font = Font.systemFont(9);
  monthLbl.textColor = COLORS.textSecondary;
  var monthlyPL = calculateMTD1PL(historicalValues);
  var monthVal = monthStack.addText(formatNumber(monthlyPL, true));
  monthVal.font = Font.boldSystemFont(11);
  monthVal.textColor = getChangeColor(monthlyPL);

  plRow.addSpacer();

  // YTD
  var ytdStack = plRow.addStack();
  ytdStack.layoutVertically();
  var ytdLbl = ytdStack.addText("YTD");
  ytdLbl.font = Font.systemFont(9);
  ytdLbl.textColor = COLORS.textSecondary;
  var ytdPL = calculateYTDPL(historicalValues);
  var ytdVal = ytdStack.addText(formatNumber(ytdPL, true));
  ytdVal.font = Font.boldSystemFont(11);
  ytdVal.textColor = getChangeColor(ytdPL);

  plRow.addSpacer();

  // All Time
  var allTimeStack = plRow.addStack();
  allTimeStack.layoutVertically();
  var allTimeLbl = allTimeStack.addText("All");
  allTimeLbl.font = Font.systemFont(9);
  allTimeLbl.textColor = COLORS.textSecondary;
  var allTimeVal = allTimeStack.addText(formatNumber(portfolio.totalProfitLossEUR, true));
  allTimeVal.font = Font.boldSystemFont(11);
  allTimeVal.textColor = getChangeColor(portfolio.totalProfitLossEUR);

  widget.addSpacer(8);

  // Graph
  if (historicalValues.length > 1) {
    var graphWidth = 300;
    var graphHeight = 60;
    var ctx = new DrawContext();
    ctx.size = new Size(graphWidth, graphHeight);
    ctx.opaque = false;
    ctx.respectScreenScale = true;
    drawGraph(ctx, historicalValues, 0, 0, graphWidth, graphHeight, 35, 14);
    var graphImg = widget.addImage(ctx.getImage());
    graphImg.imageSize = new Size(graphWidth, graphHeight);
  }

  widget.addSpacer(8);

  // Holdings Header
  var hdrRow = widget.addStack();
  hdrRow.layoutHorizontally();

  var h1 = hdrRow.addText(padRight("Symbol", 6));
  h1.font = Font.boldMonospacedSystemFont(9);
  h1.textColor = COLORS.textSecondary;

  hdrRow.addSpacer();

  var h2 = hdrRow.addText(padLeft("Value", 7));
  h2.font = Font.boldMonospacedSystemFont(9);
  h2.textColor = COLORS.textSecondary;

  hdrRow.addSpacer();

  var h3 = hdrRow.addText(padLeft("P/L", 6));
  h3.font = Font.boldMonospacedSystemFont(9);
  h3.textColor = COLORS.textSecondary;

  hdrRow.addSpacer();

  var h4 = hdrRow.addText(padLeft("A%", 5));
  h4.font = Font.boldMonospacedSystemFont(9);
  h4.textColor = COLORS.textSecondary;

  hdrRow.addSpacer();

  var h5 = hdrRow.addText(padLeft("Time", 5));
  h5.font = Font.boldMonospacedSystemFont(9);
  h5.textColor = COLORS.textSecondary;

  hdrRow.addSpacer();

  var h6 = hdrRow.addText(padLeft("Wt%", 4));
  h6.font = Font.boldMonospacedSystemFont(9);
  h6.textColor = COLORS.textSecondary;

  widget.addSpacer(4);

  // Holdings List (up to 11)
  var displayHoldings = portfolio.holdings.slice(0, 11);
  for (var i = 0; i < displayHoldings.length; i++) {
    var holding = displayHoldings[i];
    var row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    var symTxt = row.addText(padRight(holding.symbol, 8));
    symTxt.font = Font.boldMonospacedSystemFont(9);
    symTxt.textColor = COLORS.text;

    row.addSpacer();

    var valTxt = row.addText(padLeft(formatNumber(holding.valueEUR, false), 7));
    valTxt.font = Font.regularMonospacedSystemFont(9);
    valTxt.textColor = COLORS.text;

    row.addSpacer();

    var plTxt = row.addText(padLeft(formatNumber(holding.profitLossEUR, true), 7));
    plTxt.font = Font.regularMonospacedSystemFont(9);
    plTxt.textColor = getChangeColor(holding.profitLossEUR);

    row.addSpacer();

    var ayTxt = row.addText(padLeft(holding.annualizedYield != null ? holding.annualizedYield.toFixed(1) : "N/A", 5));
    ayTxt.font = Font.regularMonospacedSystemFont(9);
    ayTxt.textColor = getChangeColor(holding.annualizedYield);

    row.addSpacer();

    var timeTxt = row.addText(padLeft(holding.holdTimeYears != null ? holding.holdTimeYears.toFixed(1) + "y" : "N/A", 5));
    timeTxt.font = Font.regularMonospacedSystemFont(9);
    timeTxt.textColor = COLORS.textSecondary;

    row.addSpacer();

    var wtTxt = row.addText(padLeft(holding.portfolioPct !== null ? Math.round(holding.portfolioPct).toString() : "N/A", 4));
    wtTxt.font = Font.regularMonospacedSystemFont(9);
    wtTxt.textColor = COLORS.textSecondary;

    widget.addSpacer(2);
  }

  widget.addSpacer();

  // Footer
  var footer = widget.addStack();
  footer.layoutHorizontally();
  var updTxt = footer.addText("Updated: " + new Date().toLocaleTimeString() + " (manual)");
  updTxt.font = Font.systemFont(8);
  updTxt.textColor = COLORS.textSecondary;

  return widget;
}

// Show interactive menu (adapted for Shortcuts integration)
async function showInteractiveMenu(portfolio) {
  var alert = new Alert();
  alert.title = "Stock Portfolio";
  alert.message = "Total: " + formatNumber(portfolio.totalValueEUR, false) + "\nToday: " + formatNumber(portfolio.totalDayChangeEUR, true);

  // Option 1: Refresh via Shortcut
  alert.addAction("🔄 Refresh Prices");

  // Option 2: Add via Shortcut
  alert.addAction("➕ Add Transaction");

  // Option 3: Edit in Files app
  alert.addAction("✏️ Edit Data");

  alert.addCancelAction("Close");

  var choice = await alert.present();

  if (choice === 0) {
    // Refresh Prices - Open Shortcut
    await Safari.open("shortcuts://run-shortcut?name=RefreshPrices");
  } else if (choice === 1) {
    // Add Transaction - Open Shortcut
    await Safari.open("shortcuts://run-shortcut?name=AddTransaction");
  } else if (choice === 2) {
    // Edit Data - Open transactions file
    const fm = getFileManager();
    const transactionsPath = getTransactionsPath();
    await Safari.open("shareddocuments://" + transactionsPath);
  }
}



// === widget.js ===
// widget.js - Main entry point for Wealth Widget
// Orchestrates all modules to render portfolio widget

// ⚠️ DO NOT RUN THIS FILE DIRECTLY IN SCRIPTABLE
// This is a source file that requires building.
// Run: npm run build
// Then copy dist/widget.js to Scriptable

// Main function
async function main() {
  // Ensure data directory exists
  await ensureDataDirectory();

  // Read holdings from transactions
  var holdings = await readHoldings();

  // Extract unique symbols
  var symbols = [];
  for (var i = 0; i < holdings.length; i++) {
    symbols.push(holdings[i].symbol);
  }

  // Fetch current prices (batched for performance)
  var prices = await fetchMultipleStockPricesBatched(symbols);

  // Check if we're offline (all prices errored)
  var allErrors = true;
  for (var sym in prices) {
    if (!prices[sym].error) {
      allErrors = false;
      break;
    }
  }

  var portfolio, historicalValues, eurRates;

  if (allErrors) {
    // Offline - try to use cached prices
    var priceCache = await readPrices();

    // Build prices object from cache
    prices = {};
    for (var sym in priceCache) {
      var latestPrice = getLatestPrice(priceCache, sym);
      if (latestPrice !== null) {
        prices[sym] = {
          symbol: sym,
          price: latestPrice,
          previousClose: latestPrice, // Approximate
          change: 0,
          currency: "USD", // Assume USD
          error: false
        };
        allErrors = false;
      }
    }
  } else {
    // Online - cache new prices
    var newPrices = [];
    var today = new Date().toISOString().split("T")[0];

    for (var sym in prices) {
      if (!prices[sym].error) {
        newPrices.push({
          ticker: sym,
          date: today,
          price: prices[sym].price
        });
      }
    }

    if (newPrices.length > 0) {
      await appendPrices(newPrices);
    }
  }

  // Get EUR exchange rates for all currencies
  var currencySet = {};
  for (var sym in prices) {
    if (prices[sym].currency) {
      currencySet[prices[sym].currency] = true;
    }
  }

  var currencies = Object.keys(currencySet);
  eurRates = await fetchMultipleEURRates(currencies);

  // Calculate portfolio metrics
  portfolio = calculatePortfolio(holdings, prices, eurRates);

  // Get historical values (with monthly sampling for performance)
  // Pass current portfolio value to ensure today's value is included
  historicalValues = await getHistoricalPortfolioValues(holdings, eurRates, portfolio.totalValueEUR);

  // Render widget or show menu
  if (config.runsInWidget) {
    var widget = await createLargeWidget(portfolio, historicalValues);
    Script.setWidget(widget);
  } else {
    await showInteractiveMenu(portfolio);
  }

  Script.complete();
}

// Run main function
await main();


