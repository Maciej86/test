// Wygląd aplikacji: jeden motyw dla makiet i prawdziwej aplikacji.
// Ustalany w kroku 6 /stepkit:start razem z użytkownikiem (skill frontend-design). Czcionki i style globalne: theme.css.
// Kolory tylko stąd: w kodzie ekranów żadnych #fff, rgb(…) itp. (pilnuje tego frontend/src/test/colors.test.ts).
import type { MantineProviderProps, MantineThemeOverride } from '@mantine/core';

export const theme: MantineThemeOverride = {
  primaryColor: 'blue',
  defaultRadius: 'md',
};

/** Przełącznik jasny/ciemny motyw w nagłówku konta i panelu (wywiad, obszar „Wygląd”). */
export const COLOR_SCHEME_TOGGLE = false;

/** Ustawienia MantineProvider: bez przełącznika zawsze jasny, z przełącznikiem na start jak w systemie. */
export function colorSchemeProps(
  toggle: boolean = COLOR_SCHEME_TOGGLE,
): Pick<MantineProviderProps, 'defaultColorScheme' | 'forceColorScheme'> {
  return toggle ? { defaultColorScheme: 'auto' } : { forceColorScheme: 'light' };
}
