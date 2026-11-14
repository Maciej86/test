// Warianty wyglądu do porównania w module „Wygląd” (tylko na czas tego modułu).
// Palety leżą tu, obok motywu, bo kolory wolno wpisywać tylko w shared/src/theme*.ts (test colors.test.ts).
// Po wyborze wariantu jego ustawienia trafiają do theme.ts, a ten plik znika.
import type { MantineColorsTuple, MantineThemeOverride } from '@mantine/core';

// A. Granat klasyczny: chłodny, spokojny, jak porządnie prowadzona teczka kadrowa.
const navyA: MantineColorsTuple = ['#eef3fa', '#dbe4f2', '#b5c7e3', '#8ca8d3', '#6a8dc5', '#5079b8', '#3c64a3', '#2d4f86', '#21396a', '#16284d'];
const grayA: MantineColorsTuple = ['#f3f5f8', '#e8ecf1', '#dce1e8', '#cbd2dc', '#aab3c0', '#89929f', '#69727f', '#4e5662', '#363d47', '#22272e'];

// B. Atrament: nasycony, żywszy granat z nutą fioletu, miękkie kształty.
const navyB: MantineColorsTuple = ['#edf0fd', '#d8defa', '#aebcf2', '#8297ea', '#5d77e2', '#4561d6', '#3550c0', '#2a409c', '#1f3077', '#152154'];
const grayB: MantineColorsTuple = ['#f5f6fb', '#ebedf5', '#dfe2ee', '#cdd1e0', '#acb1c5', '#8a90a7', '#6a7088', '#4f546a', '#373b4d', '#232633'];

// C. Nocny granat: ciemna rama (menu i belka), jasna treść, stonowane, prawie szare odcienie.
const navyC: MantineColorsTuple = ['#eef2f7', '#dce3ec', '#b9c6d8', '#93a6c1', '#7189ab', '#577196', '#435c7f', '#334866', '#24354d', '#172334'];
const grayC: MantineColorsTuple = ['#f2f4f6', '#e7eaee', '#dadfe5', '#c8cfd8', '#a6afbb', '#858f9c', '#66707d', '#4c5561', '#353c45', '#21262c'];
// Wspólne dla wariantów: znaczniki bez wielkich liter (pełne słowa się mieszczą), tabela na białym tle.
const badge = { styles: { root: { textTransform: 'none' as const, letterSpacing: 0 } } };
const tableOnWhite = { table: { backgroundColor: 'var(--mantine-color-white)' } };


export const variantA: MantineThemeOverride = {
  colors: { navy: navyA, blue: navyA, gray: grayA },
  primaryColor: 'navy',
  primaryShade: 8,
  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  headings: { fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontWeight: '600' },
  defaultRadius: 'sm',
  radius: { xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  components: {
    Card: { defaultProps: { shadow: 'none' } },
    Table: { defaultProps: { verticalSpacing: 'sm' }, styles: tableOnWhite },
    Badge: badge,
    NavLink: { defaultProps: { variant: 'light' } },
  },
};

export const variantB: MantineThemeOverride = {
  colors: { navy: navyB, blue: navyB, gray: grayB },
  primaryColor: 'navy',
  primaryShade: 7,
  fontFamily: "'Onest', system-ui, sans-serif",
  headings: { fontFamily: "'Onest', system-ui, sans-serif", fontWeight: '700' },
  defaultRadius: 'lg',
  radius: { xs: '6px', sm: '8px', md: '12px', lg: '14px', xl: '20px' },
  components: {
    Card: { defaultProps: { shadow: 'sm', withBorder: false } },
    Button: { defaultProps: { radius: 'xl' } },
    Badge: { ...badge, defaultProps: { radius: 'xl' } },
    Table: { styles: tableOnWhite },
    NavLink: { defaultProps: { variant: 'filled' }, classNames: { root: 'variant-b-navlink' } },
    Title: { classNames: { root: 'variant-b-title' } },
  },
};

export const variantC: MantineThemeOverride = {
  colors: { navy: navyC, blue: navyC, gray: grayC },
  primaryColor: 'navy',
  primaryShade: 8,
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  headings: { fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: '600' },
  defaultRadius: 'xs',
  radius: { xs: '2px', sm: '3px', md: '4px', lg: '6px', xl: '8px' },
  components: {
    AppShell: { classNames: { header: 'variant-c-header', navbar: 'variant-c-navbar' } },
    NavLink: { classNames: { root: 'variant-c-navlink' } },
    Card: { defaultProps: { shadow: 'none' } },
    Table: { defaultProps: { verticalSpacing: 'xs' }, styles: tableOnWhite },
    Badge: badge,
  },
};
