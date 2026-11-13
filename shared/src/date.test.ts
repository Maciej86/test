import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatTime, toIsoDate, todayIsoDate } from './date';

describe('date formatting', () => {
  it('formats a DATE column without shifting the day', () => {
    expect(formatDate('2026-11-12')).toBe('12.11.2026');
    expect(formatDate('2026-01-01')).toBe('01.01.2026');
    expect(toIsoDate('2026-11-12')).toBe('2026-11-12');
  });

  it('shows DATETIME in the app time zone (Warsaw), whatever the machine time zone is', () => {
    // 23:30 UTC 12 listopada = 00:30 13 listopada w Warszawie (zima, UTC+1)
    expect(formatDateTime('2026-11-12T23:30:00.000Z')).toBe('13.11.2026 00:30');
    expect(formatDate(new Date('2026-11-12T23:30:00.000Z'))).toBe('13.11.2026');
    // lato, UTC+2
    expect(formatTime('2026-07-01T10:05:00.000Z')).toBe('12:05');
  });

  it('returns null for empty and invalid values', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate('')).toBeNull();
    expect(formatDate('2026-02-30')).toBeNull();
    expect(formatDateTime('nie data')).toBeNull();
  });

  it('gives today as YYYY-MM-DD', () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
