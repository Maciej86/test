import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { leaveDaysText } from '../leaveDays';

describe('leaveDaysText', () => {
  const { t } = createI18n();

  it.each([
    [1, 'working', '1 dzień roboczy'],
    [2, 'working', '2 dni robocze'],
    [5, 'working', '5 dni roboczych'],
    [22, 'working', '22 dni robocze'],
    [1, 'calendar', '1 dzień kalendarzowy'],
    [7, 'calendar', '7 dni kalendarzowych'],
    [14, 'calendar', '14 dni kalendarzowych'],
    [24, 'calendar', '24 dni kalendarzowe'],
  ] as const)('%i %s → %s', (days, dayCount, expected) => {
    expect(leaveDaysText(t, days, dayCount)).toBe(expected);
  });

  it('without day count (old notification) counts working days', () => {
    expect(leaveDaysText(t, 3)).toBe('3 dni robocze');
  });
});
