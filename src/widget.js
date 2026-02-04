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

  // Get historical values for the chart
  historicalValues = await getHistoricalPortfolioValues(holdings, eurRates, portfolio.totalValueEUR, portfolio.totalCostEUR);

  // Calculate YTD and MTD-1 using the SAME method as income widget
  // This ensures consistency between both widgets
  var currentYear = new Date().getFullYear();
  var currentMonth = new Date().getMonth() + 1;

  // Fetch historical prices from Dec 1 of previous year (same as income widget)
  var histStartDate = new Date(currentYear - 1, 11, 1);
  var allHistoricalPrices = await fetchMultipleHistoricalBatched(symbols, histStartDate);

  // Calculate monthly P/L for current year
  var monthlyPL = await calculateMonthlyPL(currentYear, allHistoricalPrices, eurRates);

  // YTD = sum of all completed months plus current month
  var ytdPL = 0;
  for (var i = 0; i < monthlyPL.length; i++) {
    if (monthlyPL[i].hasData) {
      ytdPL += monthlyPL[i].value;
    }
  }

  // MTD-1 = last month's P/L (January if we're in February, etc.)
  var mtd1PL = null;
  if (currentMonth > 1) {
    var lastMonthData = monthlyPL[currentMonth - 2]; // Array is 0-indexed, month-1 for last month, -1 more for 0-index
    if (lastMonthData && lastMonthData.hasData) {
      mtd1PL = lastMonthData.value;
    }
  } else {
    // January - get December from previous year
    var prevYearMonthlyPL = await calculateMonthlyPL(currentYear - 1, allHistoricalPrices, eurRates);
    var decData = prevYearMonthlyPL[11]; // December is index 11
    if (decData && decData.hasData) {
      mtd1PL = decData.value;
    }
  }

  // Render widget or show menu
  if (config.runsInWidget) {
    var widget = await createLargeWidget(portfolio, historicalValues, ytdPL, mtd1PL);
    Script.setWidget(widget);
  } else {
    await showInteractiveMenu(portfolio);
  }

  Script.complete();
}

// Run main function
await main();
