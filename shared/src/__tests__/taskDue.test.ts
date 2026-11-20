import { describe, expect, it } from 'vitest';
import { taskDueState } from '../taskDue';

describe('taskDueState', () => {
  const today = '2026-11-20';

  it('before today → overdue; today and tomorrow → soon; later → normal', () => {
    expect(taskDueState('2026-11-19', 'in_progress', today)).toBe('overdue');
    expect(taskDueState('2026-11-20', 'draft', today)).toBe('soon');
    expect(taskDueState('2026-11-21', 'draft', today)).toBe('soon');
    expect(taskDueState('2026-11-22', 'draft', today)).toBe('normal');
  });

  it('done or without a due date → null', () => {
    expect(taskDueState('2026-11-01', 'done', today)).toBeNull();
    expect(taskDueState(null, 'draft', today)).toBeNull();
  });

  it('end of month and year: 31.12 with today 30.12 is soon', () => {
    expect(taskDueState('2026-12-31', 'draft', '2026-12-30')).toBe('soon');
    expect(taskDueState('2027-01-01', 'draft', '2026-12-30')).toBe('normal');
  });
});
