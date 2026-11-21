import { describe, expect, it } from 'vitest';
import { calendarQuerySchema } from '../calendar';

const from = (value: unknown) => calendarQuerySchema.safeParse(value === undefined ? {} : { from: value });
const issue = (value: unknown) => from(value).error?.issues.find((i) => i.path.join('.') === 'from')?.message;

describe('calendarQuerySchema', () => {
  it('from missing or empty → null (today on the server)', () => {
    expect(calendarQuerySchema.parse({}).from).toBeNull();
    expect(calendarQuerySchema.parse({ from: '' }).from).toBeNull();
  });

  it('from 2026-11-17 → ok', () => {
    expect(calendarQuerySchema.parse({ from: '2026-11-17' }).from).toBe('2026-11-17');
  });

  it('from 2026-02-30 or text → validation.date', () => {
    expect(issue('2026-02-30')).toBe('validation.date');
    expect(issue('jutro')).toBe('validation.date');
  });

  it('from 1999-12-31 → validation.min, 2000-01-01 → ok', () => {
    expect(issue('1999-12-31')).toBe('validation.min');
    expect(from('2000-01-01').success).toBe(true);
  });

  it('from 2100-01-01 → validation.max, 2099-12-31 → ok', () => {
    expect(issue('2100-01-01')).toBe('validation.max');
    expect(from('2099-12-31').success).toBe(true);
  });

  it('unknown parameters are dropped', () => {
    expect(calendarQuerySchema.parse({ from: '2026-11-17', userId: '5' })).toEqual({ from: '2026-11-17' });
  });
});
