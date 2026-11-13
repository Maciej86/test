import { describe, expect, it } from 'vitest';
import { colorSchemeProps } from './theme';

describe('colorSchemeProps', () => {
  it('keeps the app light when the light/dark switch is off', () => {
    expect(colorSchemeProps(false)).toEqual({ forceColorScheme: 'light' });
  });

  it('follows the system setting at first when the switch is on', () => {
    expect(colorSchemeProps(true)).toEqual({ defaultColorScheme: 'auto' });
  });
});
