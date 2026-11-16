import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import {
  formatDate,
  formatDateParts,
  formatDateTime,
  formatRelativeDateTime,
  formatRelativeDay,
  formatTime,
  toIsoDate,
  todayIsoDate,
} from '../date';

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

describe('formatDateParts', () => {
  it('2026-11-14 gives sobota, 14, listopada 2026 and the full form', () => {
    expect(formatDateParts('2026-11-14')).toEqual({
      weekday: 'sobota',
      day: '14',
      monthYear: 'listopada 2026',
      full: 'sobota, 14 listopada 2026',
    });
    expect(formatDateParts('2026-03-01')?.monthYear).toBe('marca 2026');
  });

  it('empty value gives null', () => {
    expect(formatDateParts(null)).toBeNull();
    expect(formatDateParts('')).toBeNull();
  });
});

describe('relative dates', () => {
  const t = createI18n().t;
  // 16.11.2026 10:00 w Warszawie (zima, UTC+1)
  const now = new Date('2026-11-16T09:00:00.000Z');

  it('says today and yesterday by calendar day in Warsaw', () => {
    expect(formatRelativeDateTime('2026-11-16T07:32:00.000Z', t, now)).toBe('dzisiaj, 08:32');
    // 23:50 poprzedniego dnia w Warszawie = 22:50 UTC
    expect(formatRelativeDateTime('2026-11-15T22:50:00.000Z', t, now)).toBe('wczoraj, 23:50');
    // 00:10 dziś w Warszawie = 23:10 UTC poprzedniego dnia
    expect(formatRelativeDateTime('2026-11-15T23:10:00.000Z', t, now)).toBe('dzisiaj, 00:10');
    expect(formatRelativeDateTime('2026-11-14T22:50:00.000Z', t, now)).toBe('14.11.2026 23:50');
  });

  it('crosses the new year', () => {
    const jan1 = new Date('2027-01-01T08:00:00.000Z');
    expect(formatRelativeDay('2026-12-31T12:00:00.000Z', t, jan1)).toBe('Wczoraj');
    expect(formatRelativeDay('2026-12-30T12:00:00.000Z', t, jan1)).toBe('30.12.2026');
  });

  it('is not fooled by the change to summer time (a day of 23 hours)', () => {
    // 29.03.2027 00:30 w Warszawie (UTC+2) = 28.03 22:30 UTC; wczoraj 00:30 (UTC+1) = 27.03 23:30 UTC, 23 h wcześniej
    const now2 = new Date('2027-03-28T22:30:00.000Z');
    expect(formatRelativeDay('2027-03-27T23:15:00.000Z', t, now2)).toBe('Wczoraj');
    expect(formatRelativeDay('2027-03-27T22:45:00.000Z', t, now2)).toBe('27.03.2027');
    expect(formatRelativeDay('2027-03-28T22:15:00.000Z', t, now2)).toBe('Dzisiaj');
  });

  it('returns null for an empty value', () => {
    expect(formatRelativeDateTime(null, t, now)).toBeNull();
    expect(formatRelativeDay('', t, now)).toBeNull();
  });
});
