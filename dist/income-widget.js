// Income Widget - Built 2026-02-04T02:12:09.527Z
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
  background: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
  text: Color.dynamic(Color.black(), Color.white()),
  textPrimary: Color.dynamic(Color.black(), Color.white()),
  textSecondary: Color.dynamic(new Color("#6B7280"), Color.gray()),
  green: new Color("#34C759"),
  red: new Color("#FF3B30"),
  graphLine: new Color("#34C759"),
  graphLineNegative: new Color("#FF3B30"),
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

// Format currency with EUR symbol
function formatCurrency(value) {
  if (value === null || value === undefined) return "N/A";

  var absValue = Math.abs(value);
  var sign = value < 0 ? "-" : "";

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

  return sign + "€" + formatted;
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

  var startData = null, endData = null;
  for (var i = 0; i < historicalValues.length; i++) {
    if (historicalValues[i].date <= lastMonthStartStr) startData = historicalValues[i];
    if (historicalValues[i].date <= lastMonthEndStr) endData = historicalValues[i];
  }

  if (startData === null || endData === null) return null;

  // Calculate P/L at each point (value - cost) and return the change in P/L
  var startPL = startData.value - startData.cost;
  var endPL = endData.value - endData.cost;
  return endPL - startPL;
}

// Calculate YTD (year-to-date) P/L from historical values
function calculateYTDPL(historicalValues) {
  if (historicalValues.length < 2) return null;

  var now = new Date();
  var yearStart = new Date(now.getFullYear(), 0, 1);
  var yearStartStr = yearStart.toISOString().split("T")[0];

  var startData = null;
  for (var i = 0; i < historicalValues.length; i++) {
    if (historicalValues[i].date <= yearStartStr) startData = historicalValues[i];
  }

  var endData = historicalValues[historicalValues.length - 1];

  // If no data at year start, use first available data point
  if (startData === null) startData = historicalValues[0];

  // Calculate P/L at each point (value - cost) and return the change in P/L
  var startPL = startData.value - startData.cost;
  var endPL = endData.value - endData.cost;
  return endPL - startPL;
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
async function getHistoricalPortfolioValues(holdings, eurRates, currentPortfolioValue, currentPortfolioCost) {
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

    // Calculate portfolio value and cost at this date
    var holdingsAtDate = {};
    var costAtDate = {};
    for (var t = 0; t < transactions.length; t++) {
      if (transactions[t].date <= dateStr) {
        var sym = transactions[t].symbol;
        if (!holdingsAtDate[sym]) {
          holdingsAtDate[sym] = 0;
          costAtDate[sym] = 0;
        }
        holdingsAtDate[sym] += transactions[t].quantity;
        // Cost basis: quantity × purchase price
        costAtDate[sym] += transactions[t].quantity * transactions[t].price;
      }
    }

    var dayValue = 0;
    var dayCost = 0;
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
        // Convert cost to EUR using the same rate
        dayCost += costAtDate[sym] * eurRate;
        hasData = true;
      }
    }

    if (hasData) portfolioValues.push({ date: dateStr, value: dayValue, cost: dayCost });

    // Advance by interval
    currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000);
  }

  // FIX: Always add today's current portfolio value and cost as the final data point
  // This ensures YTD, MTD-1, and other metrics use up-to-date values
  var todayStr = today.toISOString().split("T")[0];
  var hasTodayValue = false;

  for (var i = 0; i < portfolioValues.length; i++) {
    if (portfolioValues[i].date === todayStr) {
      // Update with current value and cost if we already have today
      portfolioValues[i].value = currentPortfolioValue;
      portfolioValues[i].cost = currentPortfolioCost || 0;
      hasTodayValue = true;
      break;
    }
  }

  if (!hasTodayValue && currentPortfolioValue !== null && currentPortfolioValue !== undefined) {
    portfolioValues.push({
      date: todayStr,
      value: currentPortfolioValue,
      cost: currentPortfolioCost || 0
    });
  }

  return portfolioValues;
}

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

// Calculate monthly P/L for a given year
async function calculateMonthlyPL(year, allHistoricalPrices, eurRates) {
  var transactions = await readTransactions();

  var monthlyPL = [];

  // If no transactions at all, return 12 months of empty data
  if (transactions.length === 0) {
    for (var m = 1; m <= 12; m++) {
      monthlyPL.push({ month: m, value: 0, hasData: false });
    }
    return monthlyPL;
  }

  // Get current date info for future month check
  var now = new Date();
  var currentYear = now.getFullYear();
  var currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

  // Process each month (1-12)
  for (var month = 1; month <= 12; month++) {
    // Check if this month is in the future
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      monthlyPL.push({ month: month, value: 0, hasData: false });
      continue;
    }

    var monthStart = new Date(year, month - 1, 1);
    var monthEnd = new Date(year, month, 0); // Last day of month
    var monthStartStr = monthStart.toISOString().split("T")[0];
    var monthEndStr = monthEnd.toISOString().split("T")[0];

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

  // Safety check: ensure we always have 12 months
  while (monthlyPL.length < 12) {
    monthlyPL.push({ month: monthlyPL.length + 1, value: 0, hasData: false });
  }

  return monthlyPL;
}

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

// Draw bar chart with gridlines for monthly P/L visualization
function drawBarChart(context, monthlyData, x, y, width, height, leftMargin, bottomMargin) {
  // Ensure we have exactly 12 months of data
  if (!monthlyData || monthlyData.length === 0) {
    monthlyData = [];
    for (var i = 1; i <= 12; i++) {
      monthlyData.push({ month: i, value: 0, hasData: false });
    }
  }

  while (monthlyData.length < 12) {
    monthlyData.push({ month: monthlyData.length + 1, value: 0, hasData: false });
  }

  if (monthlyData.length > 12) {
    monthlyData = monthlyData.slice(0, 12);
  }

  var graphX = x + leftMargin;
  var graphWidth = width - leftMargin;
  var graphHeight = height - bottomMargin;

  // Find min and max values (all bars extend upward from 0)
  var values = monthlyData.map(function(d) { return d.value; });
  var maxVal = Math.max.apply(null, values);
  var minVal = Math.min.apply(null, values);

  // Always use 0 as minimum (all bars extend upward)
  var minVal = 0;

  // Add some padding to the max
  var range = maxVal - minVal || 1;
  maxVal = maxVal + range * 0.1;
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

  // Draw bars (all extend upward from bottom, colored by sign)
  var barWidth = graphWidth / 12;
  var barSpacing = barWidth * 0.2;
  var actualBarWidth = barWidth - barSpacing;

  for (var i = 0; i < 12; i++) {
    var barX = graphX + i * barWidth + barSpacing / 2;
    var value = monthlyData[i].value;

    if (value === 0 || !monthlyData[i].hasData) continue;

    // All bars extend upward from bottom (0 baseline)
    var absValue = Math.abs(value);
    var barHeight = (absValue / range) * graphHeight;
    var barY = y + graphHeight - barHeight;

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

// Create large income widget layout
async function createIncomeLargeWidget(year, monthlyPL, stockAttribution, totalPL, avgPL) {
  var widget = new ListWidget();
  widget.backgroundColor = COLORS.background;
  widget.setPadding(16, 8, 16, 8);

  // Enable tap to cycle through years
  var baseUrl = URLScheme.forRunningScript();
  var separator = baseUrl.indexOf("?") > -1 ? "&" : "?";
  widget.url = baseUrl + separator + "action=nextYear";

  // Header row
  var header = widget.addStack();
  header.layoutHorizontally();
  var totalText = header.addText(formatCurrency(totalPL));
  totalText.font = Font.boldSystemFont(18);
  totalText.textColor = totalPL >= 0 ? COLORS.graphLine : COLORS.graphLineNegative;
  header.addSpacer();
  var yearText = header.addText(year.toString());
  yearText.font = Font.systemFont(12);
  yearText.textColor = COLORS.textSecondary;

  widget.addSpacer(2);

  // Subtitle: Average/month
  var subtitleStr = formatCurrency(avgPL) + "/mo";
  var subtitleText = widget.addText(subtitleStr);
  subtitleText.font = Font.systemFont(10);
  subtitleText.textColor = COLORS.textSecondary;

  widget.addSpacer(8);

  // Bar chart
  var chartHeight = 100;
  var chartWidth = 300;
  var chartImage = await drawBarChartImage(monthlyPL, chartWidth, chartHeight);
  var chartImgWidget = widget.addImage(chartImage);
  chartImgWidget.imageSize = new Size(chartWidth, chartHeight);

  widget.addSpacer(8);

  // Stock breakdown header
  var hdrStack = widget.addStack();
  hdrStack.layoutHorizontally();
  var hdr1 = hdrStack.addText("Stock");
  hdr1.font = Font.boldSystemFont(9);
  hdr1.textColor = COLORS.textSecondary;
  hdrStack.addSpacer();
  var hdr2 = hdrStack.addText("P/L");
  hdr2.font = Font.boldSystemFont(9);
  hdr2.textColor = COLORS.textSecondary;
  hdrStack.addSpacer(4);
  var hdr3 = hdrStack.addText("Wt%");
  hdr3.font = Font.boldSystemFont(9);
  hdr3.textColor = COLORS.textSecondary;

  widget.addSpacer(4);

  // Stock breakdown (up to 11 rows to match wealth widget)
  for (var i = 0; i < Math.min(11, stockAttribution.length); i++) {
    var stock = stockAttribution[i];
    var stockStack = widget.addStack();
    stockStack.layoutHorizontally();
    stockStack.centerAlignContent();

    // Symbol
    var symbolText = stockStack.addText(stock.symbol);
    symbolText.font = Font.boldMonospacedSystemFont(9);
    symbolText.textColor = COLORS.text;

    // Spacer to push amount and % to the right
    stockStack.addSpacer();

    // Amount
    var plStr = (stock.yearlyPL >= 0 ? "+" : "") + formatCurrency(stock.yearlyPL);
    var amountText = stockStack.addText(plStr);
    amountText.font = Font.regularMonospacedSystemFont(9);
    amountText.textColor = stock.yearlyPL >= 0 ? COLORS.graphLine : COLORS.graphLineNegative;

    stockStack.addSpacer(4);

    // Percentage
    var pctStr = Math.round(stock.percentage) + "%";
    var pctText = stockStack.addText(pctStr);
    pctText.font = Font.regularMonospacedSystemFont(9);
    pctText.textColor = COLORS.textSecondary;

    widget.addSpacer(2);
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



// === income-widget.js ===
// income-widget.js - Monthly Income Widget Entry Point
// Displays monthly P/L visualization with per-stock attribution

// ⚠️ DO NOT RUN THIS FILE DIRECTLY IN SCRIPTABLE
// This is a source file that requires building.
// Run: npm run build
// Then copy dist/income-widget.js to Scriptable

// Handle tap interaction for year cycling (backwards through time)
async function handleYearCycle(availableYears) {
  var state = await readIncomeWidgetState();

  // Increment offset to go back in time
  state.yearOffset = state.yearOffset + 1;

  // Wrap around when we reach the oldest year
  if (state.yearOffset >= availableYears.length) {
    state.yearOffset = 0; // Return to current year
  }

  await writeIncomeWidgetState(state);

  return state.yearOffset;
}

// Main function
async function main() {
  // Debug: Log args to see what we receive
  console.log("=== DEBUG START ===");
  console.log("args exists: " + (typeof args !== "undefined"));
  if (typeof args !== "undefined") {
    console.log("args.queryParameters: " + JSON.stringify(args.queryParameters));
    console.log("args.widgetParameter: " + args.widgetParameter);
    console.log("args.shortcutParameter: " + args.shortcutParameter);
  }
  console.log("config.runsInWidget: " + config.runsInWidget);
  console.log("URLScheme.forRunningScript(): " + URLScheme.forRunningScript());
  console.log("=== DEBUG END ===");

  // Ensure data directory exists
  await ensureDataDirectory();

  // Read state and get available years
  var state = await readIncomeWidgetState();
  var transactions = await readTransactions();
  var availableYears = getYearsFromTransactions(transactions);

  // Always include current year
  var currentYear = new Date().getFullYear();
  if (availableYears.indexOf(currentYear) === -1) {
    availableYears.push(currentYear);
  }

  // Sort years in descending order (newest first)
  availableYears.sort(function(a, b) { return b - a; });

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

  // Check if this is a tap interaction
  var isInteraction = false;
  if (typeof args !== "undefined" && args.queryParameters) {
    isInteraction = args.queryParameters.action === "nextYear";
  }

  console.log("isInteraction: " + isInteraction);

  if (isInteraction) {
    await handleYearCycle(availableYears);
    state = await readIncomeWidgetState(); // Re-read updated state
  }

  // Calculate which year to display
  // offset=0 shows current year, offset=1 shows last year, etc.
  var yearIndex = state.yearOffset % availableYears.length;
  var displayYear = availableYears[yearIndex];

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
  var widget = await createIncomeLargeWidget(displayYear, monthlyPL, stockAttribution, totalPL, avgPL);

  if (config.runsInWidget || isInteraction) {
    // Running as a widget or handling tap - just update widget
    Script.setWidget(widget);
  } else {
    // Development mode: show console output and preview
    console.log("Income Widget - Year: " + displayYear);
    console.log("Total P/L: " + formatCurrency(totalPL));
    console.log("Average P/L: " + formatCurrency(avgPL));
    console.log("Completed months: " + completedMonths);
    await widget.presentLarge();
  }

  Script.complete();
}

// Run main function
await main();

