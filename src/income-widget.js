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
