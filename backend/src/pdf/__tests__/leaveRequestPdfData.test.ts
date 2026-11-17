import { describe, expect, it, vi } from 'vitest';
import { findRequestForPdf, toPdfData, type PdfRequestRow } from '../leaveRequestPdfData';

type Db = Parameters<typeof findRequestForPdf>[0];
const spyDb = (rows: unknown[]) => {
  const calls: [string, unknown[]][] = [];
  const db = { query: vi.fn(async (sql: string, params: unknown[]) => { calls.push([sql, params]); return [rows]; }) };
  return { db: db as unknown as Db, calls };
};

const row = {
  id: 21, employee_name: 'Jan Kowalski', leave_type_name: 'Wypoczynkowy', deducts_pool: 1, date_from: '2026-12-21', date_to: '2026-12-31',
  working_days: 7, days_from_carried: 2, days_from_annual: 5, pool_year: 2026, comment: null, status: 'approved',
  decided_by_name: 'Anna Nowak', decided_at: new Date('2026-12-02T09:00:00Z'), created_at: new Date('2026-11-17T09:00:00Z'),
} as unknown as PdfRequestRow;

describe('leave request PDF data', () => {
  it('with userId: only the own request (id and user_id in WHERE, ? parameters), joins the employee name', async () => {
    const { db, calls } = spyDb([row]);
    expect(await findRequestForPdf(db, 21, 7)).toBe(row);
    expect(calls[0]![0]).toMatch(/JOIN users u ON u\.id = r\.user_id/);
    expect(calls[0]![0]).toMatch(/WHERE r\.id = \? AND r\.user_id = \?/);
    expect(calls[0]![1]).toEqual([21, 7]);
  });

  it('without userId: any request by id; missing → null', async () => {
    const { db, calls } = spyDb([row]);
    await findRequestForPdf(db, 21);
    expect(calls[0]![0]).not.toMatch(/user_id = \?/);
    expect(calls[0]![1]).toEqual([21]);
    expect(await findRequestForPdf(spyDb([]).db, 21)).toBeNull();
  });

  it('toPdfData maps the row, moments as ISO text', () => {
    expect(toPdfData(row)).toEqual({
      id: 21, createdAt: '2026-11-17T09:00:00.000Z', employeeName: 'Jan Kowalski', leaveTypeName: 'Wypoczynkowy', deductsPool: true,
      dateFrom: '2026-12-21', dateTo: '2026-12-31', workingDays: 7, daysFromCarried: 2, daysFromAnnual: 5, poolYear: 2026,
      comment: null, decidedByName: 'Anna Nowak', decidedAt: '2026-12-02T09:00:00.000Z',
    });
  });
});
