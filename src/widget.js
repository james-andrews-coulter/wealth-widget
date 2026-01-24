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
