import { describe, expect, it } from 'vitest';
import { colorSchemeProps, FIXED_COLOR_SCHEME } from '../theme';

describe('colorSchemeProps', () => {
  it('keeps the app in the fixed scheme when the light/dark switch is off', () => {
    expect(colorSchemeProps(false, 'light')).toEqual({ forceColorScheme: 'light' });
    expect(colorSchemeProps(false, 'dark')).toEqual({ forceColorScheme: 'dark' });
  });

  it('follows the system setting at first when the switch is on', () => {
    expect(colorSchemeProps(true)).toEqual({ defaultColorScheme: 'auto' });
  });

  it('is always dark in this app (module Wygląd, 2026-11-14)', () => {
    expect(FIXED_COLOR_SCHEME).toBe('dark');
    expect(colorSchemeProps()).toEqual({ forceColorScheme: 'dark' });
  });
});
