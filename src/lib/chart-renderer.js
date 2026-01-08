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

export { drawGraph };
