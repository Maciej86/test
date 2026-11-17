import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEAVE_REQUEST_COMMENT_MAX, LEAVE_REQUEST_STATUSES } from '@app/shared';

const sql = readFileSync(new URL('../../../../migrations/017_leave_requests.sql', import.meta.url), 'utf8');

describe('migration 017_leave_requests', () => {
  it('foreign keys: user and leave type RESTRICT (history stays), decided_by SET NULL with a name copy', () => {
    expect(sql).toMatch(/FOREIGN KEY \(user_id\) REFERENCES users \(id\) ON DELETE RESTRICT/);
    expect(sql).toMatch(/FOREIGN KEY \(leave_type_id\) REFERENCES leave_types \(id\) ON DELETE RESTRICT/);
    expect(sql).toMatch(/FOREIGN KEY \(decided_by\) REFERENCES users \(id\) ON DELETE SET NULL/);
    expect(sql).toMatch(/decided_by_name VARCHAR\(141\) NULL/);
  });

  it('comment length matches the schema limit, statuses match the constants', () => {
    expect(sql).toMatch(new RegExp(`comment VARCHAR\\(${LEAVE_REQUEST_COMMENT_MAX}\\) NULL`));
    expect(sql).toContain(`ENUM(${LEAVE_REQUEST_STATUSES.map((s) => `'${s}'`).join(',')}) NOT NULL DEFAULT 'pending'`);
  });

  it('one table per migration', () => {
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(1);
  });
});
