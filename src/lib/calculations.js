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
    // Cost must also be converted to EUR using the same rate as value
    // (purchasePrice is in native currency from transactions)
    const costEUR = holding.purchasePrice ? holding.quantity * holding.purchasePrice * eurRate : null;
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
  var lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];
  var lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];

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
  var yearStartStr = yearStart.toISOString().split('T')[0];

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

  // Build list of dates to sample: monthly intervals PLUS year boundaries
  // This ensures YTD and yearly calculations have accurate boundary data
  var sampleDates = [];
  var currentDate = new Date(firstDate);
  var interval = 30; // Monthly sampling

  while (currentDate <= today) {
    sampleDates.push(new Date(currentDate));
    currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000);
  }

  // Add year start dates (Jan 1 of each year from first year to current)
  var firstYear = firstDate.getFullYear();
  var currentYear = today.getFullYear();
  for (var y = firstYear; y <= currentYear; y++) {
    var yearStart = new Date(y, 0, 1);
    if (yearStart >= firstDate && yearStart <= today) {
      sampleDates.push(yearStart);
    }
  }

  // Add month start AND end dates for current year (for accurate MTD calculations)
  for (var m = 0; m < 12; m++) {
    var monthStart = new Date(currentYear, m, 1);
    var monthEnd = new Date(currentYear, m + 1, 0); // Last day of month
    if (monthStart >= firstDate && monthStart <= today) {
      sampleDates.push(monthStart);
    }
    if (monthEnd >= firstDate && monthEnd <= today) {
      sampleDates.push(monthEnd);
    }
  }

  // Also add month boundaries for previous year (for YTD calculations spanning year end)
  var prevYear = currentYear - 1;
  for (var m = 0; m < 12; m++) {
    var monthStart = new Date(prevYear, m, 1);
    var monthEnd = new Date(prevYear, m + 1, 0);
    if (monthStart >= firstDate && monthStart <= today) {
      sampleDates.push(monthStart);
    }
    if (monthEnd >= firstDate && monthEnd <= today) {
      sampleDates.push(monthEnd);
    }
  }

  // Sort and deduplicate
  sampleDates.sort(function(a, b) { return a - b; });
  var uniqueDates = [];
  for (var i = 0; i < sampleDates.length; i++) {
    var dateStr = sampleDates[i].toISOString().split('T')[0];
    if (uniqueDates.length === 0 || uniqueDates[uniqueDates.length - 1] !== dateStr) {
      uniqueDates.push(dateStr);
    }
  }

  // Process each sample date
  for (var idx = 0; idx < uniqueDates.length; idx++) {
    var dateStr = uniqueDates[idx];
    currentDate = new Date(dateStr);

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
        // Use per-symbol currency for correct conversion
        var symCurrency = getCurrencyFromSymbol(sym);
        var eurRate = eurRates[symCurrency] || 1;
        dayValue += holdingsAtDate[sym] * closestPrice * eurRate;
        // Convert cost to EUR using the same rate
        dayCost += costAtDate[sym] * eurRate;
        hasData = true;
      }
    }

    if (hasData) portfolioValues.push({ date: dateStr, value: dayValue, cost: dayCost });
  }

  // FIX: Always add today's current portfolio value and cost as the final data point
  // This ensures YTD, MTD-1, and other metrics use up-to-date values
  var todayStr = today.toISOString().split('T')[0];
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
    var monthStartStr = monthStart.toISOString().split('T')[0];
    var monthEndStr = monthEnd.toISOString().split('T')[0];

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

    // Get all unique symbols from both start and end
    var allSymbols = {};
    for (var sym in holdingsAtStart) allSymbols[sym] = true;
    for (var sym in holdingsAtEnd) allSymbols[sym] = true;

    // Process each symbol consistently
    for (var sym in allSymbols) {
      var qtyAtStart = holdingsAtStart[sym] || 0;
      var qtyAtEnd = holdingsAtEnd[sym] || 0;
      var cAtStart = costAtStart[sym] || 0;
      var cAtEnd = costAtEnd[sym] || 0;

      // Skip if no holdings at either boundary
      if (qtyAtStart <= 0 && qtyAtEnd <= 0) continue;

      var histData = allHistoricalPrices[sym];
      if (!histData || histData.length === 0) continue;

      // Find prices at both boundaries
      var priceAtStart = null;
      var priceAtEnd = null;
      for (var k = 0; k < histData.length; k++) {
        var histDate = new Date(histData[k].date);
        if (histDate <= monthStart) priceAtStart = histData[k].price;
        if (histDate <= monthEnd) priceAtEnd = histData[k].price;
      }

      // Need end price to calculate anything
      if (priceAtEnd === null) continue;

      // If holdings at start but no start price, skip (can't calculate properly)
      if (qtyAtStart > 0 && priceAtStart === null) continue;

      var symCurrency = getCurrencyFromSymbol(sym);
      var eurRate = eurRates[symCurrency] || 1;

      // For start: if no holdings, value is 0 regardless of price
      if (qtyAtStart > 0 && priceAtStart !== null) {
        valueAtStart += qtyAtStart * priceAtStart * eurRate;
        totalCostAtStart += cAtStart * eurRate;
      }

      // For end: add value and cost
      if (qtyAtEnd > 0) {
        valueAtEnd += qtyAtEnd * priceAtEnd * eurRate;
        totalCostAtEnd += cAtEnd * eurRate;
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
  var yearStartStr = yearStart.toISOString().split('T')[0];
  var yearEndStr = yearEnd.toISOString().split('T')[0];

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

    // Skip if no end price (can't calculate current value)
    if (priceAtEnd === null) continue;

    // If we have holdings at start but no price, we can't calculate - skip
    // But if holdingsAtStart is 0 (new position), we don't need priceAtStart
    if (priceAtStart === null && holdingsAtStart > 0) continue;

    // Use per-symbol currency for correct conversion
    var symCurrency = getCurrencyFromSymbol(sym);
    var eurRate = eurRates[symCurrency] || 1;

    // For new positions (zero holdings at start), valueAtStart = 0 regardless of price
    var valueAtStart = (holdingsAtStart > 0 && priceAtStart !== null) ? holdingsAtStart * priceAtStart * eurRate : 0;
    var totalCostAtStart = costAtStart * eurRate;
    var valueAtEnd = holdingsAtEnd * priceAtEnd * eurRate;
    var totalCostAtEnd = costAtEnd * eurRate;

    var startPL = valueAtStart - totalCostAtStart;
    var endPL = valueAtEnd - totalCostAtEnd;

    stockYearlyPL[sym] = endPL - startPL;
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
