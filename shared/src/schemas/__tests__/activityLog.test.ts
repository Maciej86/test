import { describe, expect, it } from 'vitest';
import { activityLogQuerySchema } from '../activityLog';

describe('activityLogQuerySchema', () => {
  it('defaults: page 1, empty search, no filters', () => {
    expect(activityLogQuerySchema.parse({})).toEqual({ page: 1, search: '' });
  });

  it('reads all filters from the address', () => {
    expect(activityLogQuerySchema.parse({ page: '2', search: ' kowal ', area: 'tasks', userId: '7', from: '2026-11-01', to: '2026-11-20' })).toEqual({
      page: 2, search: 'kowal', area: 'tasks', userId: 7, from: '2026-11-01', to: '2026-11-20',
    });
  });

  it('search longer than 100 characters is dropped', () => {
    expect(activityLogQuerySchema.parse({ search: 'x'.repeat(101) }).search).toBe('');
    expect(activityLogQuerySchema.parse({ search: 'x'.repeat(100) }).search).toHaveLength(100);
  });

  it('unknown area, bad userId and bad dates are dropped', () => {
    expect(activityLogQuerySchema.parse({ area: 'orders', userId: '-1', from: '2026-02-30', to: 'wczoraj' })).toEqual({ page: 1, search: '' });
    expect(activityLogQuerySchema.parse({ userId: '1e3' }).userId).toBeUndefined();
    expect(activityLogQuerySchema.parse({ userId: '0' }).userId).toBeUndefined();
  });

  it('from and to are inclusive ISO dates; the same day is fine, to before from is an error on "to"', () => {
    expect(activityLogQuerySchema.safeParse({ from: '2026-11-20', to: '2026-11-20' }).success).toBe(true);
    const bad = activityLogQuerySchema.safeParse({ from: '2026-11-20', to: '2026-11-19' });
    expect(bad.success).toBe(false);
    expect(bad.error!.issues).toEqual([expect.objectContaining({ path: ['to'], message: 'activity-log.validation.dates_order' })]);
  });
});
