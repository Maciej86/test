import { describe, expect, it } from 'vitest';
import { calendarDays, calendarSegments } from '../calendar';

// 17.11.2026 (wtorek) i 60 kolejnych dni: do 16.01.2027.
const days = calendarDays('2026-11-17', 61);
const at = (iso: string) => days.indexOf(iso);

describe('calendarDays', () => {
  it('61 days from the start, ISO dates', () => {
    expect(days).toHaveLength(61);
    expect(days[0]).toBe('2026-11-17');
    expect(days[60]).toBe('2027-01-16');
  });
});

describe('calendarSegments', () => {
  it('working days leave over a weekend → two bars and a bridge (Fri–Tue 20–24.11)', () => {
    expect(calendarSegments('2026-11-20', '2026-11-24', days, 'working')).toEqual([
      { start: at('2026-11-20'), end: at('2026-11-20'), bridge: false },
      { start: at('2026-11-21'), end: at('2026-11-22'), bridge: true },
      { start: at('2026-11-23'), end: at('2026-11-24'), bridge: false },
    ]);
  });

  it('working days leave over Christmas Eve and holidays → bars only on working days (21–31.12)', () => {
    const bars = calendarSegments('2026-12-21', '2026-12-31', days, 'working').filter((s) => !s.bridge);
    expect(bars).toEqual([
      { start: at('2026-12-21'), end: at('2026-12-23'), bridge: false },
      { start: at('2026-12-28'), end: at('2026-12-31'), bridge: false },
    ]);
  });

  it('calendar days leave → one bar including the weekend', () => {
    expect(calendarSegments('2026-11-16', '2026-11-22', days, 'calendar')).toEqual([{ start: 0, end: at('2026-11-22'), bridge: false }]);
  });

  it('leave starting before the range → cut to the first day, no leading bridge', () => {
    // 14–15.11 to weekend przed zakresem; w zakresie zostaje 17–18.11.
    expect(calendarSegments('2026-11-12', '2026-11-18', days, 'working')).toEqual([{ start: 0, end: 1, bridge: false }]);
  });

  it('leave ending after the range → cut to the last day, no trailing bridge', () => {
    // 16.01.2027 to sobota (ostatni widoczny dzień): po kawałku 11–15.01 nie ma przerwy na końcu.
    expect(calendarSegments('2027-01-11', '2027-01-20', days, 'working')).toEqual([{ start: at('2027-01-11'), end: at('2027-01-15'), bridge: false }]);
  });

  it('one day leave → one bar; leave outside the range → nothing', () => {
    expect(calendarSegments('2026-12-04', '2026-12-04', days, 'working')).toEqual([{ start: at('2026-12-04'), end: at('2026-12-04'), bridge: false }]);
    expect(calendarSegments('2027-02-01', '2027-02-05', days, 'working')).toEqual([]);
  });
});
