import { describe, expect, it } from 'vitest';
import { listQuerySchema } from './list';

const schema = listQuerySchema(['name', 'created_at']);

describe('listQuerySchema', () => {
  it('fills defaults for an empty address', () => {
    expect(schema.parse({})).toEqual({ page: 1, search: '', sort: 'name', dir: 'asc' });
  });

  it('reads values from the address as text', () => {
    expect(schema.parse({ page: '3', search: ' kowal ', sort: 'created_at', dir: 'desc' })).toEqual({
      page: 3,
      search: 'kowal',
      sort: 'created_at',
      dir: 'desc',
    });
  });

  it('falls back to safe values for a broken page or direction', () => {
    expect(schema.parse({ page: '-2', dir: 'up' })).toMatchObject({ page: 1, dir: 'asc' });
  });

  it('rejects sorting by a column outside the list', () => {
    const result = schema.safeParse({ sort: 'password_hash' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('validation.list_sort');
  });
});
