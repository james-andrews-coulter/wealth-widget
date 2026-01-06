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

// Build historical portfolio values with monthly sampling for performance
async function getHistoricalPortfolioValues(holdings, eurRates) {
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

  // Adaptive sampling based on time range
  var now = new Date();
  var sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  var twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

  // Sample more frequently for recent data
  var samplingIntervals = [];
  var currentDate = new Date(firstDate);

  while (currentDate <= today) {
    var dateStr = currentDate.toISOString().split("T")[0];

    // Determine sampling interval based on date
    var interval;
    if (currentDate >= sixMonthsAgo) {
      interval = 1; // Daily for last 6 months
    } else if (currentDate >= twoYearsAgo) {
      interval = 7; // Weekly for 6 months - 2 years
    } else {
      interval = 30; // Monthly for >2 years ago
    }

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

  return portfolioValues;
}

export {
  calculatePortfolio,
  calculateMTD1PL,
  calculateYTDPL,
  getFirstHoldingDate,
  getHistoricalPortfolioValues
};
