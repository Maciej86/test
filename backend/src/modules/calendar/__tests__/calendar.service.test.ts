import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('../../employees/employees.queries', () => ({ listActiveUsers: vi.fn() }));
vi.mock('../../leave-requests/leave-requests.queries', () => ({ listCalendarAbsences: vi.fn() }));
vi.mock('@app/shared', async (orig) => ({ ...(await orig<object>()), todayIsoDate: () => '2026-11-17' }));

const employees = await import('../../employees/employees.queries');
const requests = await import('../../leave-requests/leave-requests.queries');
const { pool } = await import('../../../db/pool');
const s = await import('../calendar.service');

const people = [{ id: 8, name: 'Paweł Dąbrowski' }, { id: 2, name: 'Jan Kowalski' }];
const absence = { id: 21, userId: 2, leaveTypeName: 'Wypoczynkowy', color: 'green' as const, status: 'pending' as const, dateFrom: '2026-11-26', dateTo: '2026-11-27', days: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(employees.listActiveUsers).mockResolvedValue(people);
  vi.mocked(requests.listCalendarAbsences).mockResolvedValue([absence]);
});

describe('calendar service', () => {
  it('no from → range from today, to = from + 60 days, today from todayIsoDate', async () => {
    expect(await s.getCalendar(null)).toEqual({ from: '2026-11-17', to: '2027-01-16', today: '2026-11-17', people, absences: [absence] });
  });

  it('from given → range from that day (2026-12-01 – 2027-01-30)', async () => {
    const r = await s.getCalendar('2026-12-01');
    expect([r.from, r.to]).toEqual(['2026-12-01', '2027-01-30']);
    expect(requests.listCalendarAbsences).toHaveBeenCalledWith(pool, [8, 2], '2026-12-01', '2027-01-30');
  });

  it('people: active employees only (role employee, no archive, order from the query)', async () => {
    await s.getCalendar(null);
    expect(employees.listActiveUsers).toHaveBeenCalledWith(pool, 'employee');
  });

  it('absences only of listed people (ids passed to the query)', async () => {
    vi.mocked(employees.listActiveUsers).mockResolvedValue([]);
    await s.getCalendar(null);
    expect(requests.listCalendarAbsences).toHaveBeenCalledWith(pool, [], '2026-11-17', '2027-01-16');
  });
});
