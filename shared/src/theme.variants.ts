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
// D. Nocny granat, cały ciemny: jaśniejszy, stalowy granat na przyciskach (czytelny na ciemnym tle)
// i granatowe odcienie ciemnego tła (Mantine „dark”: 0 = tekst, 4 = obramowania, 6 = karty, 7–8 = tło, 9 = rama).
const navyD: MantineColorsTuple = ['#e8eef8', '#cfdbee', '#a9bfe0', '#83a3d2', '#6189c4', '#4b77ba', '#3f68a6', '#335689', '#27436b', '#1b2f4c'];
const darkD: MantineColorsTuple = ['#dbe2ec', '#b9c4d3', '#93a1b5', '#6c7b91', '#3c4a61', '#2f3c53', '#233047', '#1a2537', '#141d2c', '#0e1520'];

// Wspólne dla wariantów: znaczniki bez wielkich liter (pełne słowa się mieszczą), tabela na tle karty
// (w jasnym motywie białym, w ciemnym ciemnogranatowym).
const badge = { styles: { root: { textTransform: 'none' as const, letterSpacing: 0 } } };
const tableOnWhite = { table: { backgroundColor: 'var(--mantine-color-default)' } };


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

export const variantD: MantineThemeOverride = {
  ...variantC,
  colors: { navy: navyD, blue: navyD, gray: grayC, dark: darkD },
  primaryShade: { light: 8, dark: 6 },
  components: {
    ...variantC.components,
    AppShell: { classNames: { header: 'variant-d-header', navbar: 'variant-d-navbar' } },
    NavLink: { classNames: { root: 'variant-d-navlink' } },
  },
};
