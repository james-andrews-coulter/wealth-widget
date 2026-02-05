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
          currency: 'USD', // Assume USD
          error: false
        };
        allErrors = false;
      }
    }
  } else {
    // Online - cache new prices
    var newPrices = [];
    var today = new Date().toISOString().split('T')[0];

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

  // Calculate YTD and MTD-1 using the shared function
  // This ensures consistency between wealth widget and income widget
  var metrics = await calculateYTDandMTD1(symbols);
  var ytdPL = metrics.ytdPL;
  var mtd1PL = metrics.mtd1PL;

  console.log('[WEALTH] About to render widget, runsInWidget=' + config.runsInWidget);
  console.log('[WEALTH] ytdPL=' + ytdPL + ', mtd1PL=' + mtd1PL);

  // ALWAYS create and set the widget (for home screen)
  // Then show preview or menu based on run context
  try {
    console.log('[WEALTH] Creating large widget...');
    var widget = await createLargeWidget(portfolio, historicalValues, ytdPL, mtd1PL);
    console.log('[WEALTH] Widget created successfully');
    Script.setWidget(widget);
    console.log('[WEALTH] Widget set for home screen');

    if (!config.runsInWidget) {
      // Running manually - show widget preview so we can see it
      console.log('[WEALTH] Previewing widget...');
      await widget.presentLarge();
      console.log('[WEALTH] Preview shown');
    }
  } catch (e) {
    console.log('[WEALTH] ERROR: ' + e.message);
    console.log('[WEALTH] Stack: ' + e.stack);
    // Show error in widget
    var errorWidget = new ListWidget();
    errorWidget.backgroundColor = new Color('#FF0000');
    var errorText = errorWidget.addText('Error: ' + e.message);
    errorText.textColor = Color.white();
    Script.setWidget(errorWidget);
    if (!config.runsInWidget) {
      await errorWidget.presentLarge();
    }
  }

  Script.complete();
}

// Run main function
await main();
