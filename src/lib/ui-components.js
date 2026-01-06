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

export { createLargeWidget, showInteractiveMenu };
