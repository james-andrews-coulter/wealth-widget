// income-widget.js - Monthly Income Widget Entry Point
// Displays monthly P/L visualization with per-stock attribution

// ⚠️ DO NOT RUN THIS FILE DIRECTLY IN SCRIPTABLE
// This is a source file that requires building.
// Run: npm run build
// Then copy dist/income-widget.js to Scriptable

// Handle tap interaction for year cycling
async function handleYearCycle() {
  var state = await readIncomeWidgetState();
  var transactions = await readTransactions();
  var availableYears = getYearsFromTransactions(transactions);

  // Increment year offset (wrap around)
  state.yearOffset = (state.yearOffset + 1) % availableYears.length;

  await writeIncomeWidgetState(state);

  return state.yearOffset;
}

// Main function
async function main() {
  // Check if this is a tap interaction
  var isInteraction = args.queryParameters && args.queryParameters.action === "nextYear";

  if (isInteraction) {
    await handleYearCycle();
  }

  // Ensure data directory exists
  await ensureDataDirectory();

  // Read state to determine which year to display
  var state = await readIncomeWidgetState();
  var transactions = await readTransactions();
  var availableYears = getYearsFromTransactions(transactions);

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

  // Calculate which year to display
  var yearIndex = state.yearOffset % availableYears.length;
  var displayYear = availableYears[availableYears.length - 1 - yearIndex];

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
  if (config.runsInWidget) {
    var widget = await createIncomeLargeWidget(displayYear, monthlyPL, stockAttribution, totalPL, avgPL);
    Script.setWidget(widget);
  } else {
    // Development mode: show year and total
    console.log("Income Widget - Year: " + displayYear);
    console.log("Total P/L: " + formatCurrency(totalPL));
    console.log("Average P/L: " + formatCurrency(avgPL));
    console.log("Completed months: " + completedMonths);

    var widget = await createIncomeLargeWidget(displayYear, monthlyPL, stockAttribution, totalPL, avgPL);
    await widget.presentLarge();
  }

  Script.complete();
}

// Run main function
await main();
