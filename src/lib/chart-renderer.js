// chart-renderer.js - Canvas-based line chart drawing
// Extracted from current script lines 454-515

// Draw line chart with axes and labels
function drawGraph(context, data, x, y, width, height, leftMargin, bottomMargin) {
  if (data.length < 2) return;

  var graphX = x + leftMargin;
  var graphWidth = width - leftMargin;
  var graphHeight = height - bottomMargin;

  var values = data.map(function(d) { return d.value; });
  var minVal = Math.min.apply(null, values);
  var maxVal = Math.max.apply(null, values);
  var range = maxVal - minVal || 1;

  // Draw Y-axis labels
  context.setFont(Font.systemFont(8));
  context.setTextColor(COLORS.textSecondary);
  var maxLabel = formatNumber(maxVal, false);
  var minLabel = formatNumber(minVal, false);
  context.drawText(maxLabel, new Point(x, y));
  context.drawText(minLabel, new Point(x, y + graphHeight - 10));

  // Draw axis line
  context.setStrokeColor(COLORS.axisLine);
  context.setLineWidth(1);
  var axisPath = new Path();
  axisPath.move(new Point(graphX, y + graphHeight));
  axisPath.addLine(new Point(graphX + graphWidth, y + graphHeight));
  context.addPath(axisPath);
  context.strokePath();

  // Draw year ticks on X-axis with smart spacing
  var years = {};
  var yearList = [];
  for (var i = 0; i < data.length; i++) {
    var yr = data[i].date.substring(0, 4);
    if (!years[yr]) {
      years[yr] = i;
      yearList.push(parseInt(yr));
    }
  }

  // Sort years chronologically
  yearList.sort(function(a, b) { return a - b; });

  // Smart tick spacing: calculate optimal interval based on range
  var yearSpan = yearList.length;
  var tickInterval = 1;
  var maxTicks = 6; // Maximum number of ticks to show

  if (yearSpan > maxTicks) {
    // Calculate interval to keep ticks under max
    tickInterval = Math.ceil(yearSpan / maxTicks);
  }

  // Select which years to display
  var displayYears = [];
  for (var i = 0; i < yearList.length; i += tickInterval) {
    displayYears.push(yearList[i]);
  }

  // Always include the last year if not already included
  var lastYear = yearList[yearList.length - 1];
  if (displayYears.indexOf(lastYear) === -1) {
    displayYears.push(lastYear);
  }

  context.setFont(Font.systemFont(6));
  for (var i = 0; i < displayYears.length; i++) {
    var yr = displayYears[i].toString();
    var idx = years[yr];
    var tickX = graphX + (idx / (data.length - 1)) * graphWidth;
    context.drawText(yr, new Point(tickX - 8, y + graphHeight + 2));

    var tickPath = new Path();
    tickPath.move(new Point(tickX, y + graphHeight));
    tickPath.addLine(new Point(tickX, y + graphHeight + 3));
    context.addPath(tickPath);
    context.strokePath();
  }

  // Draw graph line
  var path = new Path();
  var stepX = graphWidth / (data.length - 1);

  for (var i = 0; i < data.length; i++) {
    var px = graphX + i * stepX;
    var py = y + graphHeight - ((data[i].value - minVal) / range) * graphHeight;

    if (i === 0) {
      path.move(new Point(px, py));
    } else {
      path.addLine(new Point(px, py));
    }
  }

  context.setStrokeColor(COLORS.graphLine);
  context.setLineWidth(2);
  context.addPath(path);
  context.strokePath();
}

// Draw bar chart with gridlines for monthly P/L visualization
function drawBarChart(context, monthlyData, x, y, width, height, leftMargin, bottomMargin) {
  // Ensure we have exactly 12 months of data
  if (!monthlyData || monthlyData.length === 0) {
    monthlyData = [];
    for (var i = 1; i <= 12; i++) {
      monthlyData.push({ month: i, value: 0, hasData: false });
    }
  }

  while (monthlyData.length < 12) {
    monthlyData.push({ month: monthlyData.length + 1, value: 0, hasData: false });
  }

  if (monthlyData.length > 12) {
    monthlyData = monthlyData.slice(0, 12);
  }

  var graphX = x + leftMargin;
  var graphWidth = width - leftMargin;
  var graphHeight = height - bottomMargin;

  // Find min and max values (all bars extend upward from 0)
  var values = monthlyData.map(function(d) { return d.value; });
  var maxVal = Math.max.apply(null, values);
  var minVal = Math.min.apply(null, values);

  // Always use 0 as minimum (all bars extend upward)
  var minVal = 0;

  // Add some padding to the max
  var range = maxVal - minVal || 1;
  maxVal = maxVal + range * 0.1;
  range = maxVal - minVal;

  // Calculate gridline interval (round to nice numbers)
  var gridInterval = Math.pow(10, Math.floor(Math.log10(range / 4)));
  if (range / gridInterval > 8) gridInterval *= 2;
  if (range / gridInterval > 8) gridInterval *= 2.5;

  // Draw horizontal gridlines
  context.setStrokeColor(COLORS.axisLine);
  context.setLineWidth(0.5);
  context.setFont(Font.systemFont(8));
  context.setTextColor(COLORS.textSecondary);

  var gridValue = Math.ceil(minVal / gridInterval) * gridInterval;
  while (gridValue <= maxVal) {
    var gridY = y + graphHeight - ((gridValue - minVal) / range) * graphHeight;

    // Draw gridline
    var gridPath = new Path();
    gridPath.move(new Point(graphX, gridY));
    gridPath.addLine(new Point(graphX + graphWidth, gridY));
    context.addPath(gridPath);
    context.strokePath();

    // Draw Y-axis label
    var label = formatNumber(gridValue, false);
    context.drawText(label, new Point(x, gridY - 5));

    gridValue += gridInterval;
  }

  // Draw bars (all extend upward from bottom, colored by sign)
  var barWidth = graphWidth / 12;
  var barSpacing = barWidth * 0.2;
  var actualBarWidth = barWidth - barSpacing;

  for (var i = 0; i < 12; i++) {
    var barX = graphX + i * barWidth + barSpacing / 2;
    var value = monthlyData[i].value;

    if (value === 0 || !monthlyData[i].hasData) continue;

    // All bars extend upward from bottom (0 baseline)
    var absValue = Math.abs(value);
    var barHeight = (absValue / range) * graphHeight;
    var barY = y + graphHeight - barHeight;

    // Color based on positive/negative
    var barColor = value >= 0 ? COLORS.graphLine : COLORS.graphLineNegative;

    // Draw bar
    context.setFillColor(barColor);
    var barRect = new Rect(barX, barY, actualBarWidth, barHeight);
    context.fillRect(barRect);
  }

  // Draw month labels (J F M A M J J A S O N D)
  var monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  context.setFont(Font.systemFont(10));
  context.setTextColor(COLORS.textSecondary);

  for (var i = 0; i < 12; i++) {
    var labelX = graphX + i * barWidth + barWidth / 2 - 4;
    var labelY = y + graphHeight + 5;
    context.drawText(monthLabels[i], new Point(labelX, labelY));
  }
}

export { drawGraph, drawBarChart };
