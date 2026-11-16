import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BACKUP_SLOTS,
  backupKind,
  expiredVersions,
  kindFromKey,
  lastDueSlot,
  nextSlot,
  objectKeys,
  parseSlots,
  planRun,
  retainUntil,
} from '../schedule';

const at = (iso: string) => new Date(iso);
const HOUR = 3600 * 1000;

describe('backup kind and retention', () => {
  it('midnight in Poland is daily, the first of the month is monthly, the rest is intraday', () => {
    expect(backupKind(at('2026-11-14T23:00:00Z'))).toBe('daily'); // 15.11 0:00 PL (zima, UTC+1)
    expect(backupKind(at('2026-11-30T23:00:00Z'))).toBe('monthly'); // 1.12 0:00 PL
    expect(backupKind(at('2026-07-14T22:00:00Z'))).toBe('daily'); // 15.07 0:00 PL (lato, UTC+2)
    expect(backupKind(at('2026-11-15T10:00:00Z'))).toBe('intraday'); // 11:00 PL
  });

  it('a run caught up after the server was off is intraday', () => {
    expect(backupKind(at('2026-11-15T06:14:00Z'))).toBe('intraday'); // 7:14 PL
  });

  it('protects copies for 7, 35 and 400 days', () => {
    const now = at('2026-11-15T10:00:00Z');
    expect(retainUntil(now, 'intraday').toISOString()).toBe('2026-11-22T10:00:00.000Z');
    expect(retainUntil(now, 'daily').toISOString()).toBe('2026-12-20T10:00:00.000Z');
    expect(retainUntil(now, 'monthly').toISOString()).toBe('2027-12-20T10:00:00.000Z');
  });

  it('names files by kind and Polish time, and reads the kind back', () => {
    const keys = objectKeys(at('2026-11-15T15:30:00Z'), 'intraday');
    expect(keys).toEqual({
      db: 'intraday/2026-11-15_1630-db.sql.gz.age',
      files: 'intraday/2026-11-15_1630-files.tar.gz.age',
    });
    expect(kindFromKey(keys.db)).toBe('intraday');
    expect(kindFromKey('other/x')).toBeNull();
  });

  it('prints variables without spaces for bash', () => {
    const out = planRun(at('2026-11-30T23:00:00Z'));
    expect(out).toContain('KIND=monthly');
    expect(out).toContain('RETAIN_UNTIL=2028-01-04T23:00:00Z');
    expect(out).not.toMatch(/ /);
  });
});

describe('expired versions', () => {
  const json = JSON.stringify({
    Versions: [
      { Key: 'intraday/a-db.sql.gz.age', VersionId: 'old', LastModified: '2026-11-01T10:00:00Z' },
      { Key: 'intraday/b-db.sql.gz.age', VersionId: 'fresh', LastModified: '2026-11-10T10:00:00Z' },
      { Key: 'monthly/c-db.sql.gz.age', VersionId: 'kept', LastModified: '2026-01-01T00:00:00Z' },
      { Key: 'something/else', VersionId: 'foreign', LastModified: '2020-01-01T00:00:00Z' },
    ],
  });

  it('lists only our files past their protection plus one day', () => {
    expect(expiredVersions(json, at('2026-11-15T10:00:00Z'))).toBe('intraday/a-db.sql.gz.age\told');
  });

  it('handles an empty bucket', () => {
    expect(expiredVersions('', at('2026-11-15T10:00:00Z'))).toBe('');
  });
});

describe('slots', () => {
  it('reads slots from .env and falls back to the defaults', () => {
    expect(parseSlots('16:30, 00:00')).toEqual(['00:00', '16:30']);
    expect(parseSlots('')).toEqual(DEFAULT_BACKUP_SLOTS);
    expect(parseSlots('25:00,abc')).toEqual(DEFAULT_BACKUP_SLOTS);
  });

  it('finds the last slot older than the grace period', () => {
    // 12:00 PL: slot 11:00 minął 60 min temu, czyli jeszcze nie „ponad 60” → poprzedni to 0:00.
    expect(lastDueSlot(at('2026-11-15T11:00:00Z'), HOUR, DEFAULT_BACKUP_SLOTS)?.toISOString()).toBe(
      '2026-11-14T23:00:00.000Z',
    );
    // 12:01 PL → 11:00.
    expect(lastDueSlot(at('2026-11-15T11:01:00Z'), HOUR, DEFAULT_BACKUP_SLOTS)?.toISOString()).toBe(
      '2026-11-15T10:00:00.000Z',
    );
  });

  it('keeps slots on Polish wall time on both clock-change days', () => {
    // 29.03.2026 (zmiana na letni): 11:00 PL = 9:00 UTC.
    expect(lastDueSlot(at('2026-03-29T10:30:00Z'), HOUR, DEFAULT_BACKUP_SLOTS)?.toISOString()).toBe(
      '2026-03-29T09:00:00.000Z',
    );
    // 25.10.2026 (zmiana na zimowy): 11:00 PL = 10:00 UTC.
    expect(lastDueSlot(at('2026-10-25T11:30:00Z'), HOUR, DEFAULT_BACKUP_SLOTS)?.toISOString()).toBe(
      '2026-10-25T10:00:00.000Z',
    );
  });

  it('a single daily slot looks back to yesterday', () => {
    expect(lastDueSlot(at('2026-11-15T22:30:00Z'), HOUR, ['00:00'])?.toISOString()).toBe('2026-11-14T23:00:00.000Z');
  });

  it('names the next slot', () => {
    expect(nextSlot(at('2026-11-15T11:00:00Z'), DEFAULT_BACKUP_SLOTS)).toBe('16:30');
    expect(nextSlot(at('2026-11-15T20:00:00Z'), DEFAULT_BACKUP_SLOTS)).toBe('00:00');
  });
});
