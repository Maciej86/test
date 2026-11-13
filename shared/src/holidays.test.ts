import { describe, expect, it } from 'vitest';
import { createI18n, translateKey } from './i18n';
import {
  countWorkingDays,
  easterSunday,
  getHoliday,
  getPolishHolidays,
  isHoliday,
  isWorkingDay,
} from './holidays';

describe('Polish holidays', () => {
  it('computes Easter Sunday for known years', () => {
    expect(easterSunday(2024)).toBe('2024-03-31');
    expect(easterSunday(2025)).toBe('2025-04-20');
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    expect(easterSunday(2038)).toBe('2038-04-25');
  });

  it('lists 14 holidays from 2025 and 13 before (Christmas Eve free since 2025)', () => {
    expect(getPolishHolidays(2025)).toHaveLength(14);
    expect(getPolishHolidays(2024)).toHaveLength(13);
    expect(isHoliday('2024-12-24')).toBe(false);
    expect(isHoliday('2025-12-24')).toBe(true);
  });

  it('includes movable holidays computed from Easter', () => {
    const dates = getPolishHolidays(2026).map((h) => h.date);
    expect(dates).toContain('2026-04-06'); // poniedziałek wielkanocny
    expect(dates).toContain('2026-05-24'); // Zielone Świątki
    expect(dates).toContain('2026-06-04'); // Boże Ciało
  });

  it('returns holidays sorted by date', () => {
    const dates = getPolishHolidays(2026).map((h) => h.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('has a translated name for every holiday', () => {
    const i18n = createI18n();
    for (const h of getPolishHolidays(2026)) {
      expect(translateKey(i18n.t, h.label)).not.toBe(h.label.split('.').slice(1).join('.'));
    }
    expect(translateKey(i18n.t, getHoliday('2026-11-11')!.label)).toBe('Narodowe Święto Niepodległości');
  });

  it('knows working days', () => {
    expect(isWorkingDay('2026-11-12')).toBe(true); // czwartek
    expect(isWorkingDay('2026-11-14')).toBe(false); // sobota
    expect(isWorkingDay('2026-11-11')).toBe(false); // święto
    expect(isWorkingDay(null)).toBe(false);
  });

  it('counts working days inclusive', () => {
    // 9–13.11.2026: pn–pt, 11.11 to święto
    expect(countWorkingDays('2026-11-09', '2026-11-13')).toBe(4);
    // 21.12.2026–3.01.2027: 24, 25, 26.12 i 1.01 to święta, weekendy odpadają
    expect(countWorkingDays('2026-12-21', '2027-01-03')).toBe(7);
    expect(countWorkingDays('2026-11-13', '2026-11-09')).toBe(0);
  });

  it('skips extra company days off', () => {
    expect(isWorkingDay('2026-11-10', ['2026-11-10'])).toBe(false);
    expect(countWorkingDays('2026-11-09', '2026-11-13', new Set(['2026-11-10']))).toBe(3);
    expect(countWorkingDays('2026-11-09', '2026-11-13', [])).toBe(4);
  });
});
