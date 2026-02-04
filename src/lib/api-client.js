// api-client.js - Yahoo Finance API integration with batching
// Extracted from current script lines 174-248, optimized for performance

// Fetch current price for a single stock
async function fetchStockPrice(symbol) {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + symbol + '?interval=1d&range=1d';

  try {
    const request = new Request(url);
    request.headers = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' };
    const response = await request.loadJSON();

    if (response.chart && response.chart.result && response.chart.result[0]) {
      const meta = response.chart.result[0].meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose || meta.chartPreviousClose;

      return {
        symbol: symbol,
        price: currentPrice,
        previousClose: previousClose,
        change: currentPrice - previousClose,
        currency: meta.currency || 'USD',
        marketState: meta.marketState,
        error: false
      };
    }

    throw new Error('Invalid response');
  } catch (error) {
    return { symbol: symbol, price: null, error: true };
  }
}

// Fetch historical data for a symbol from start date to now
async function fetchHistoricalData(symbol, startDate) {
  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(Date.now() / 1000);
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + symbol + '?period1=' + start + '&period2=' + end + '&interval=1d';

  try {
    const request = new Request(url);
    request.headers = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' };
    const response = await request.loadJSON();

    if (response.chart && response.chart.result && response.chart.result[0]) {
      const result = response.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators.quote[0].close || [];
      const data = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null) {
          data.push({
            date: new Date(timestamps[i] * 1000),
            price: closes[i]
          });
        }
      }

      return data;
    }

    return [];
  } catch (error) {
    return [];
  }
}

// Fetch EUR exchange rate for a currency
async function getEURRate(currency) {
  if (currency === 'EUR') return 1;

  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + currency + 'EUR=X?interval=1d&range=1d';

  try {
    const request = new Request(url);
    request.headers = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' };
    const response = await request.loadJSON();

    if (response.chart && response.chart.result && response.chart.result[0]) {
      return response.chart.result[0].meta.regularMarketPrice;
    }

    return 1;
  } catch (error) {
    return 1;
  }
}

// ⚡ PERFORMANCE OPTIMIZATION: Batch multiple stock price fetches
async function fetchMultipleStockPricesBatched(symbols) {
  // Execute all fetches in parallel using Promise.all
  const results = await Promise.all(symbols.map(function(s) { return fetchStockPrice(s); }));

  // Convert array to map for easier lookup
  const priceMap = {};
  for (let i = 0; i < results.length; i++) {
    priceMap[results[i].symbol] = results[i];
  }

  return priceMap;
}

// ⚡ PERFORMANCE OPTIMIZATION: Batch historical data fetches
async function fetchMultipleHistoricalBatched(symbols, startDate) {
  // Execute all fetches in parallel using Promise.all
  const results = await Promise.all(
    symbols.map(function(s) { return fetchHistoricalData(s, startDate); })
  );

  // Convert array to map {symbol: [priceData]}
  const historicalMap = {};
  for (let i = 0; i < symbols.length; i++) {
    historicalMap[symbols[i]] = results[i];
  }

  return historicalMap;
}

// Fetch EUR rates for multiple currencies in batch
async function fetchMultipleEURRates(currencies) {
  const results = await Promise.all(
    currencies.map(function(c) { return getEURRate(c); })
  );

  const rateMap = {};
  for (let i = 0; i < currencies.length; i++) {
    rateMap[currencies[i]] = results[i];
  }

  return rateMap;
}

export {
  fetchStockPrice,
  fetchHistoricalData,
  getEURRate,
  fetchMultipleStockPricesBatched,
  fetchMultipleHistoricalBatched,
  fetchMultipleEURRates
};
