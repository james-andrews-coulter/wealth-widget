// formatters.js - Number formatting and color utilities
// Extracted from current Scriptable widget

// Color scheme with dynamic light/dark mode support
const COLORS = {
  bg: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
  background: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
  text: Color.dynamic(Color.black(), Color.white()),
  textPrimary: Color.dynamic(Color.black(), Color.white()),
  textSecondary: Color.dynamic(new Color("#6B7280"), Color.gray()),
  green: new Color("#34C759"),
  red: new Color("#FF3B30"),
  graphLine: new Color("#34C759"),
  graphLineNegative: new Color("#FF3B30"),
  axisLine: Color.dynamic(new Color("#E5E5EA"), new Color("#3A3A3C"))
};

// Format number with K suffix for thousands, optional sign
function formatNumber(value, showSign) {
  if (value === null || value === undefined) return "N/A";

  var absValue = Math.abs(value);
  var sign = "";

  if (showSign && value >= 0) sign = "+";
  if (value < 0) sign = "-";

  var formatted;
  if (absValue >= 1000) {
    var k = absValue / 1000;
    if (k >= 100) {
      formatted = Math.round(k).toLocaleString("en-US") + "K";
    } else {
      formatted = k.toFixed(1).replace(/\.0$/, "") + "K";
    }
  } else {
    formatted = Math.round(absValue).toLocaleString("en-US");
  }

  return sign + formatted;
}

// Format percentage with optional sign
function formatPercent(value, showSign) {
  if (value === null || value === undefined) return "N/A";

  var sign = "";
  if (showSign && value >= 0) sign = "+";
  if (value < 0) sign = "-";

  return sign + Math.abs(value).toFixed(1) + "%";
}

// Format currency with EUR symbol
function formatCurrency(value) {
  if (value === null || value === undefined) return "N/A";

  var absValue = Math.abs(value);
  var sign = value < 0 ? "-" : "";

  var formatted;
  if (absValue >= 1000) {
    var k = absValue / 1000;
    if (k >= 100) {
      formatted = Math.round(k).toLocaleString("en-US") + "K";
    } else {
      formatted = k.toFixed(1).replace(/\.0$/, "") + "K";
    }
  } else {
    formatted = Math.round(absValue).toLocaleString("en-US");
  }

  return sign + "€" + formatted;
}

// Pad string to left with spaces
function padLeft(str, len) {
  str = String(str);
  while (str.length < len) str = " " + str;
  return str;
}

// Pad string to right with spaces
function padRight(str, len) {
  str = String(str);
  while (str.length < len) str = str + " ";
  return str;
}

// Get color based on positive/negative value
function getChangeColor(value) {
  if (value === null || value === undefined) return COLORS.textSecondary;
  if (value > 0) return COLORS.green;
  if (value < 0) return COLORS.red;
  return COLORS.textSecondary;
}

// Determine currency from symbol suffix
// .AS (Amsterdam), .MI (Milan) = EUR
// .L (London) = GBP
// -EUR suffix = EUR
// Default = USD
function getCurrencyFromSymbol(symbol) {
  if (!symbol) return "USD";
  symbol = symbol.toUpperCase();

  if (symbol.endsWith(".AS") || symbol.endsWith(".MI")) return "EUR";
  if (symbol.endsWith(".L")) return "GBP";
  if (symbol.includes("-EUR")) return "EUR";
  if (symbol.includes("-GBP")) return "GBP";
  if (symbol.includes("-USD")) return "USD";

  // US stocks (no suffix)
  return "USD";
}

export { COLORS, formatNumber, formatPercent, formatCurrency, padLeft, padRight, getChangeColor, getCurrencyFromSymbol };
