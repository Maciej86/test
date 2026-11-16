// Wygląd aplikacji: jeden motyw dla makiet i prawdziwej aplikacji („Nocny granat”, moduł Wygląd, 2026-11-14).
// Opis i zasady: docs/DESIGN.md. Czcionki i style globalne (ciemna rama, odcienie znaczników): theme.css.
// Kolory tylko stąd: w kodzie ekranów żadnych #fff, rgb(…) itp. (pilnuje tego frontend/src/test/colors.test.ts).
import type { MantineColorsTuple, MantineProviderProps, MantineThemeOverride } from '@mantine/core';

/** Granat główny: przyciski, linki, zaznaczenia. Na ciemnym tle używany odcień 6 (stalowy, czytelny z białym napisem). */
const navy: MantineColorsTuple = ['#e8eef8', '#cfdbee', '#a9bfe0', '#83a3d2', '#6189c4', '#4b77ba', '#3f68a6', '#335689', '#27436b', '#1b2f4c'];

/**
 * Tła i teksty ciemnego motywu w odcieniach granatu (zamiast szarości Mantine):
 * 0 = tekst, 2 = tekst przygaszony, 4 = obramowania, 6 = karty i tabele, 7 = tło strony, 8 = tło panelu, 9 = rama.
 */
const dark: MantineColorsTuple = ['#dbe2ec', '#b9c4d3', '#93a1b5', '#6c7b91', '#3c4a61', '#2f3c53', '#233047', '#1a2537', '#141d2c', '#0e1520'];

/** Szarości lekko w stronę granatu (znaczniki „neutralne”, np. rola Pracownik). */
const gray: MantineColorsTuple = ['#f2f4f6', '#e7eaee', '#dadfe5', '#c8cfd8', '#a6afbb', '#858f9c', '#66707d', '#4c5561', '#353c45', '#21262c'];

export const theme: MantineThemeOverride = {
  // „blue” = ten sam granat, żeby color="blue" w ekranach nie odstawał od reszty.
  colors: { navy, blue: navy, gray, dark },
  primaryColor: 'navy',
  primaryShade: { light: 8, dark: 6 },
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  headings: { fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: '600' },
  defaultRadius: 'xs',
  radius: { xs: '2px', sm: '3px', md: '4px', lg: '6px', xl: '8px' },
  components: {
    // Ciemna rama: belka i menu najciemniejsze (klasy w theme.css).
    AppShell: { classNames: { header: 'app-header', navbar: 'app-navbar' } },
    NavLink: { classNames: { root: 'app-navlink' } },
    Card: { defaultProps: { shadow: 'none' } },
    // Tabela na tle karty, żeby odcinała się od tła panelu.
    Table: { defaultProps: { verticalSpacing: 'xs' }, styles: { table: { backgroundColor: 'var(--mantine-color-default)' } } },
    // Znaczniki zwykłymi literami: pełne słowa się mieszczą i lepiej się czytają.
    Badge: { styles: { root: { textTransform: 'none', letterSpacing: 0 } } },
  },
};

/** Przełącznik jasny/ciemny motyw w nagłówku konta i panelu (wywiad, obszar „Wygląd”). */
export const COLOR_SCHEME_TOGGLE = false;

/** Motyw bez przełącznika: zawsze ciemny (moduł Wygląd, 2026-11-14). */
export const FIXED_COLOR_SCHEME: 'light' | 'dark' = 'dark';

/** Ustawienia MantineProvider: bez przełącznika zawsze FIXED_COLOR_SCHEME, z przełącznikiem na start jak w systemie. */
export const colorSchemeProps = (
  toggle: boolean = COLOR_SCHEME_TOGGLE,
  fixed: 'light' | 'dark' = FIXED_COLOR_SCHEME,
): Pick<MantineProviderProps, 'defaultColorScheme' | 'forceColorScheme'> => {
  return toggle ? { defaultColorScheme: 'auto' } : { forceColorScheme: fixed };
};
