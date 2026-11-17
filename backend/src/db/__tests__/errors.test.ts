import { describe, expect, it } from 'vitest';
import { isDuplicateEntry } from '../errors';

const dbError = (code: string, message: string) => Object.assign(new Error(message), { code });

describe('isDuplicateEntry', () => {
  it('recognises a unique index violation (ER_DUP_ENTRY) and nothing else', () => {
    expect(isDuplicateEntry(dbError('ER_DUP_ENTRY', "Duplicate entry 'x' for key 'uq_leave_types_name'"))).toBe(true);
    expect(isDuplicateEntry(dbError('ER_NO_REFERENCED_ROW_2', 'fk'))).toBe(false);
    expect(isDuplicateEntry(new Error('ER_DUP_ENTRY'))).toBe(false);
    expect(isDuplicateEntry('ER_DUP_ENTRY')).toBe(false);
    expect(isDuplicateEntry(null)).toBe(false);
  });

  it('with an index name: only a violation of that index', () => {
    const email = dbError('ER_DUP_ENTRY', "Duplicate entry 'a@b.pl' for key 'users.uq_users_email'");
    expect(isDuplicateEntry(email, 'uq_users_email')).toBe(true);
    expect(isDuplicateEntry(email, 'uq_users_login')).toBe(false);
  });
});
