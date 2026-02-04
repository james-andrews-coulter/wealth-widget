import './setup.js';
import {
  formatNumber,
  formatPercent,
  formatCurrency,
  padLeft,
  padRight,
  getCurrencyFromSymbol,
} from '../formatters.js';

describe('formatNumber', () => {
  test('returns N/A for null or undefined', () => {
    expect(formatNumber(null)).toBe('N/A');
    expect(formatNumber(undefined)).toBe('N/A');
  });

  test('formats small numbers without K suffix', () => {
    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(999)).toBe('999');
  });

  test('formats thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(10000)).toBe('10K');
    expect(formatNumber(100000)).toBe('100K');
  });

  test('shows sign when requested', () => {
    expect(formatNumber(500, true)).toBe('+500');
    expect(formatNumber(-500, true)).toBe('-500');
    expect(formatNumber(1500, true)).toBe('+1.5K');
    expect(formatNumber(-1500, true)).toBe('-1.5K');
  });

  test('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(0, true)).toBe('+0');
  });

  test('handles negative numbers', () => {
    expect(formatNumber(-500)).toBe('-500');
    expect(formatNumber(-1500)).toBe('-1.5K');
  });
});

describe('formatPercent', () => {
  test('returns N/A for null or undefined', () => {
    expect(formatPercent(null)).toBe('N/A');
    expect(formatPercent(undefined)).toBe('N/A');
  });

  test('formats percentage with one decimal', () => {
    expect(formatPercent(5.56)).toBe('5.6%');
    expect(formatPercent(10)).toBe('10.0%');
  });

  test('shows sign when requested', () => {
    expect(formatPercent(5.5, true)).toBe('+5.5%');
    expect(formatPercent(-5.5, true)).toBe('-5.5%');
  });

  test('handles zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(0, true)).toBe('+0.0%');
  });
});

describe('formatCurrency', () => {
  test('returns N/A for null or undefined', () => {
    expect(formatCurrency(null)).toBe('N/A');
    expect(formatCurrency(undefined)).toBe('N/A');
  });

  test('formats with EUR symbol', () => {
    expect(formatCurrency(500)).toBe('€500');
    expect(formatCurrency(1500)).toBe('€1.5K');
  });

  test('handles negative values', () => {
    expect(formatCurrency(-500)).toBe('-€500');
    expect(formatCurrency(-1500)).toBe('-€1.5K');
  });

  test('handles zero', () => {
    expect(formatCurrency(0)).toBe('€0');
  });
});

describe('padLeft', () => {
  test('pads string to specified length', () => {
    expect(padLeft('5', 3)).toBe('  5');
    expect(padLeft('50', 3)).toBe(' 50');
    expect(padLeft('500', 3)).toBe('500');
  });

  test('handles strings longer than padding', () => {
    expect(padLeft('5000', 3)).toBe('5000');
  });
});

describe('padRight', () => {
  test('pads string to specified length', () => {
    expect(padRight('5', 3)).toBe('5  ');
    expect(padRight('50', 3)).toBe('50 ');
    expect(padRight('500', 3)).toBe('500');
  });
});

describe('getCurrencyFromSymbol', () => {
  test('returns EUR for Amsterdam stocks', () => {
    expect(getCurrencyFromSymbol('ASML.AS')).toBe('EUR');
  });

  test('returns EUR for Milan stocks', () => {
    expect(getCurrencyFromSymbol('ENI.MI')).toBe('EUR');
  });

  test('returns GBP for London stocks', () => {
    expect(getCurrencyFromSymbol('BP.L')).toBe('GBP');
  });

  test('returns USD for US stocks (no suffix)', () => {
    expect(getCurrencyFromSymbol('AAPL')).toBe('USD');
    expect(getCurrencyFromSymbol('MSFT')).toBe('USD');
  });

  test('handles -EUR suffix', () => {
    expect(getCurrencyFromSymbol('BTC-EUR')).toBe('EUR');
  });

  test('handles null/undefined', () => {
    expect(getCurrencyFromSymbol(null)).toBe('USD');
    expect(getCurrencyFromSymbol(undefined)).toBe('USD');
  });

  test('is case insensitive', () => {
    expect(getCurrencyFromSymbol('asml.as')).toBe('EUR');
    expect(getCurrencyFromSymbol('bp.l')).toBe('GBP');
  });
});
