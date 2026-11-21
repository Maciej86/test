import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEAVE_DAY_COUNTS } from '@app/shared';

const read = (name: string) => readFileSync(new URL(`../../../../migrations/${name}`, import.meta.url), 'utf8');
const enumSql = `ENUM(${LEAVE_DAY_COUNTS.map((d) => `'${d}'`).join(',')}) NOT NULL DEFAULT 'working'`;

describe('migrations of calendar part 2', () => {
  it('031: leave_types.day_count with the values of LEAVE_DAY_COUNTS, one change', () => {
    const sql = read('031_leave_types_day_count.sql');
    expect(sql).toMatch(/ALTER TABLE leave_types ADD COLUMN day_count/);
    expect(sql).toContain(enumSql);
    expect(sql.match(/ALTER TABLE/g)).toHaveLength(1);
  });

  it('032: leave_types.requires_approval defaults to TRUE (old types keep waiting for a decision)', () => {
    const sql = read('032_leave_types_requires_approval.sql');
    expect(sql).toMatch(/ALTER TABLE leave_types ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT TRUE/);
    expect(sql.match(/ALTER TABLE/g)).toHaveLength(1);
  });

  it('033: leave_requests.day_count (old requests = working) and a comment on working_days', () => {
    const sql = read('033_leave_requests_day_count.sql');
    expect(sql).toMatch(/ALTER TABLE leave_requests/);
    expect(sql).toContain(`ADD COLUMN day_count ${enumSql}`);
    expect(sql).toMatch(/MODIFY COLUMN working_days [^;]*COMMENT '[^']+'/);
    expect(sql.match(/ALTER TABLE/g)).toHaveLength(1);
  });

  it('034: leave_requests.auto_approved defaults to FALSE', () => {
    const sql = read('034_leave_requests_auto_approved.sql');
    expect(sql).toMatch(/ALTER TABLE leave_requests ADD COLUMN auto_approved BOOLEAN NOT NULL DEFAULT FALSE/);
    expect(sql.match(/ALTER TABLE/g)).toHaveLength(1);
  });

  it('035: adds "Chorobowe" only when no type has this name (also hidden): calendar, no approval, no pool, grape, last', () => {
    const sql = read('035_leave_types_sick_seed.sql');
    expect(sql).toMatch(/INSERT INTO leave_types \(position, name, deducts_pool, yearly_limit, color, day_count, requires_approval\)/);
    expect(sql).toMatch(/SELECT COALESCE\(MAX\(position\), 0\) \+ 1, 'Chorobowe', FALSE, NULL, 'grape', 'calendar', FALSE/);
    expect(sql).toMatch(/WHERE NOT EXISTS \(SELECT 1 FROM leave_types WHERE name = 'Chorobowe'\)/);
    expect(sql).not.toMatch(/hidden_at IS NULL/);
  });
});
