import { describe, expect, it } from 'vitest';
import { formatMoney, formatNumber } from './number';

const nbsp = ' ';

describe('number formatting', () => {
  it('formats money the Polish way', () => {
    expect(formatMoney(1234.5)).toBe(`1${nbsp}234,50${nbsp}zł`);
    expect(formatMoney(0)).toBe(`0,00${nbsp}zł`);
    expect(formatMoney(-19.99)).toBe(`-19,99${nbsp}zł`);
    expect(formatMoney(1234567.891)).toBe(`1${nbsp}234${nbsp}567,89${nbsp}zł`);
  });

  it('accepts DECIMAL columns, which mysql2 returns as text', () => {
    expect(formatMoney('1234.50')).toBe(`1${nbsp}234,50${nbsp}zł`);
    expect(formatNumber('12500')).toBe(`12${nbsp}500`);
  });

  it('shows only the decimals that are needed, unless told otherwise', () => {
    expect(formatNumber(7.5)).toBe('7,5');
    expect(formatNumber(12)).toBe('12');
    expect(formatNumber(1.005, 0)).toBe('1');
    expect(formatNumber(3, 1)).toBe('3,0');
  });

  it('returns null for empty and invalid values', () => {
    expect(formatMoney(null)).toBeNull();
    expect(formatMoney(undefined)).toBeNull();
    expect(formatMoney('')).toBeNull();
    expect(formatNumber('abc')).toBeNull();
    expect(formatNumber(Number.NaN)).toBeNull();
  });

  it('does not show minus zero', () => {
    expect(formatNumber(-0.001, 2)).toBe('0,00');
  });
});
