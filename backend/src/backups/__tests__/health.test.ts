import { describe, expect, it } from 'vitest';
import { backupHealth, shouldAlert, type BackupRun } from '../health';
import { DEFAULT_BACKUP_SLOTS, lastDueSlot } from '../schedule';

const at = (iso: string) => new Date(iso);
const MIN = 60 * 1000;
const slots = DEFAULT_BACKUP_SLOTS;
const success = (startedAt: Date): BackupRun => ({ startedAt, status: 'success', error: null });

describe('backup health', () => {
  it('no copy at all is a problem', () => {
    expect(backupHealth({ lastRun: null, lastSuccessAt: null, now: at('2026-11-15T12:00:00Z'), slots }).problem).toBe(
      'never',
    );
  });

  it('a failed last run is a problem even right after a success', () => {
    const lastRun: BackupRun = { startedAt: at('2026-11-15T10:00:00Z'), status: 'failed', error: 'upload_failed' };
    const health = backupHealth({ lastRun, lastSuccessAt: at('2026-11-14T23:00:00Z'), now: at('2026-11-15T10:05:00Z'), slots });
    expect(health.problem).toBe('failed');
  });

  it('a missed slot becomes stale only after the grace period', () => {
    const lastSuccessAt = at('2026-11-14T23:00:00Z'); // 0:00 PL
    const lastRun = success(lastSuccessAt);
    expect(backupHealth({ lastRun, lastSuccessAt, now: at('2026-11-15T11:00:00Z'), slots }).ok).toBe(true); // 12:00
    const late = backupHealth({ lastRun, lastSuccessAt, now: at('2026-11-15T11:01:00Z'), slots }); // 12:01
    expect(late.problem).toBe('stale');
    expect(late.missedSlotAt?.toISOString()).toBe('2026-11-15T10:00:00.000Z');
  });

  it.each(['2026-11-15', '2026-03-29', '2026-10-25'])(
    'a whole day (%s) with every copy on time never looks like a problem',
    (day) => {
      const start = at(`${day}T00:00:00Z`).getTime() - 26 * 60 * MIN;
      let lastSuccessAt: Date | null = null;
      for (let t = start; t < start + 26 * 60 * MIN; t += 5 * MIN) {
        const now = new Date(t);
        // Kopia z każdego slotu kończy się 2 minuty po jego godzinie.
        const due = lastDueSlot(new Date(t - 2 * MIN), 0, slots);
        if (due) lastSuccessAt = due;
        if (!lastSuccessAt) continue;
        const health = backupHealth({ lastRun: success(lastSuccessAt), lastSuccessAt, now, slots });
        expect(health.ok, now.toISOString()).toBe(true);
      }
    },
  );
});

describe('alert limit', () => {
  const bad = backupHealth({ lastRun: null, lastSuccessAt: null, now: at('2026-11-15T12:00:00Z'), slots });

  it('sends at most one e-mail a day and none when all is fine', () => {
    const now = at('2026-11-15T12:00:00Z');
    expect(shouldAlert(bad, null, now)).toBe(true);
    expect(shouldAlert(bad, at('2026-11-15T00:00:00Z'), now)).toBe(false);
    expect(shouldAlert(bad, at('2026-11-14T12:00:00Z'), now)).toBe(true);
    expect(shouldAlert({ ...bad, ok: true, problem: null }, null, now)).toBe(false);
  });
});
