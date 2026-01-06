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

export {
  readTransactions,
  readHoldings,
  writeTransaction,
  readPrices,
  appendPrices,
  getLatestPrice,
  getPriceOnDate
};
