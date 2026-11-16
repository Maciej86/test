import { describe, expect, it } from 'vitest';
import { createI18n } from '@app/shared';
import { dayLabel, whenLabel } from '../notificationTime';

const t = createI18n().getFixedT('pl', 'notifications');
// 16.11.2026 12:00 w Warszawie (UTC+1).
const now = new Date('2026-11-16T11:00:00Z');

describe('notification time', () => {
  it('today → "dzisiaj, GG:MM"', () => {
    expect(whenLabel('2026-11-16T09:32:00.000Z', now, t)).toBe('dzisiaj, 10:32');
  });

  it('yesterday 23:50 → "wczoraj, 23:50", not today', () => {
    expect(whenLabel('2026-11-15T22:50:00.000Z', now, t)).toBe('wczoraj, 23:50');
  });

  it('older → full date and time', () => {
    expect(whenLabel('2026-11-12T10:08:00.000Z', now, t)).toBe('12.11.2026 11:08');
  });

  it('new year: 01.01 vs 31.12 → yesterday', () => {
    expect(whenLabel('2026-12-31T20:00:00.000Z', new Date('2027-01-01T08:00:00Z'), t)).toBe('wczoraj, 21:00');
  });

  it('dayLabel: Dzisiaj / Wczoraj / date', () => {
    expect(dayLabel('2026-11-16T09:32:00.000Z', now, t)).toBe('Dzisiaj');
    expect(dayLabel('2026-11-15T22:50:00.000Z', now, t)).toBe('Wczoraj');
    expect(dayLabel('2026-11-12T10:08:00.000Z', now, t)).toBe('12.11.2026');
  });
});
