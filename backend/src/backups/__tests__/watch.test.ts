import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));

const { checkBackups } = await import('../watch');
const { DEFAULT_BACKUP_SLOTS } = await import('../schedule');

/** Udawana baza: odpowiedzi po kolei, jak w checkBackups. */
const fakeDb = (lastRun: object | null, lastSuccessAt: string | null, lastSentAt: string | null) => {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("status <> 'skipped'")) return [lastRun ? [lastRun] : []];
    if (sql.includes('MAX(started_at)')) return [[{ at: lastSuccessAt }]];
    if (sql.includes('FROM system_alerts')) return [lastSentAt ? [{ last_sent_at: lastSentAt }] : []];
    return [{ affectedRows: 0 }];
  });
  return { query } as never as { query: typeof query };
};

const now = new Date('2026-11-15T12:00:00Z');

describe('checkBackups', () => {
  it('sends an alert and remembers when', async () => {
    const db = fakeDb({ started_at: '2026-11-15T10:00:00Z', status: 'failed', error: 'dump_incomplete' }, '2026-11-14T23:00:00Z', null);
    const sendAlert = vi.fn(async () => {});
    await expect(checkBackups({ now, slots: DEFAULT_BACKUP_SLOTS, sendAlert, db: db as never })).resolves.toBe(true);
    expect(sendAlert).toHaveBeenCalledWith(expect.objectContaining({ problem: 'failed' }));
    expect(db.query.mock.calls.some(([sql]) => String(sql).startsWith('INSERT INTO system_alerts'))).toBe(true);
  });

  it('stays quiet when the last e-mail went out less than a day ago', async () => {
    const db = fakeDb(null, null, '2026-11-15T06:00:00Z');
    const sendAlert = vi.fn(async () => {});
    await expect(checkBackups({ now, slots: DEFAULT_BACKUP_SLOTS, sendAlert, db: db as never })).resolves.toBe(false);
    expect(sendAlert).not.toHaveBeenCalled();
  });

  it('stays quiet when copies are on time and cleans old runs', async () => {
    const run = { started_at: '2026-11-15T10:00:00Z', status: 'success', error: null };
    const db = fakeDb(run, '2026-11-15T10:00:00Z', null);
    const sendAlert = vi.fn(async () => {});
    await expect(checkBackups({ now, slots: DEFAULT_BACKUP_SLOTS, sendAlert, db: db as never })).resolves.toBe(false);
    expect(db.query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM backup_runs'))).toBe(true);
  });

  it('does not remember the alert when sending failed, so the next check tries again', async () => {
    const db = fakeDb(null, null, null);
    const sendAlert = vi.fn(async () => {
      throw new Error('smtp');
    });
    await expect(checkBackups({ now, slots: DEFAULT_BACKUP_SLOTS, sendAlert, db: db as never })).rejects.toThrow('smtp');
    expect(db.query.mock.calls.some(([sql]) => String(sql).startsWith('INSERT INTO system_alerts'))).toBe(false);
  });
});
