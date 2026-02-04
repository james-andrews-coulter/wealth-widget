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
