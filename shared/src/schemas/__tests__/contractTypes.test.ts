import { describe, expect, it } from 'vitest';
import { contractTypeSchema } from '../contractTypes';

const issue = (r: { error?: { issues: { message: string; path: PropertyKey[] }[] } }, field: string) =>
  r.error?.issues.find((i) => i.path.join('.') === field)?.message;

describe('contractTypeSchema', () => {
  it('name: 1 char → too_short, 2 ok, 60 ok, 61 → too_long', () => {
    expect(issue(contractTypeSchema.safeParse({ name: 'B' }), 'name')).toBe('validation.too_short');
    expect(contractTypeSchema.safeParse({ name: 'B2' }).success).toBe(true);
    expect(contractTypeSchema.safeParse({ name: 'a'.repeat(60) }).success).toBe(true);
    expect(issue(contractTypeSchema.safeParse({ name: 'a'.repeat(61) }), 'name')).toBe('validation.too_long');
  });

  it('" B2B " is trimmed to "B2B"; empty → validation.required', () => {
    expect(contractTypeSchema.parse({ name: ' B2B ' }).name).toBe('B2B');
    expect(issue(contractTypeSchema.safeParse({ name: '   ' }), 'name')).toBe('validation.required');
    expect(issue(contractTypeSchema.safeParse({}), 'name')).toBe('validation.required');
  });

  it('unknown fields are dropped', () => {
    expect(contractTypeSchema.parse({ name: 'B2B', position: 1, hidden: true })).toEqual({ name: 'B2B' });
  });
});

