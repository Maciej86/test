import { fireEvent, render, screen } from '@testing-library/react';
import { useComputedColorScheme, useMantineTheme } from '@mantine/core';
import { I18nextProvider } from 'react-i18next';
import { theme } from '@app/shared/theme';
import { i18n } from '../test/render';
import { ThemeVariantProvider, VariantSwitch, type ThemeVariant } from './ThemeVariants';

const variants: ThemeVariant[] = [
  { key: 'a', label: 'A. Jasny firmowy', theme: { primaryColor: 'blue' } },
  { key: 'b', label: 'B. Kolorowy', theme: { primaryColor: 'grape' } },
];

function Probe() {
  return (
    <>
      <span>kolor: {useMantineTheme().primaryColor}</span>
      <span>tryb: {useComputedColorScheme()}</span>
    </>
  );
}

function renderWith(list: ThemeVariant[]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeVariantProvider variants={list}>
        <VariantSwitch />
        <Probe />
      </ThemeVariantProvider>
    </I18nextProvider>,
  );
}

describe('theme variants in mockups', () => {
  it('uses the app theme and hides the switch when there are no variants', () => {
    renderWith([]);
    expect(screen.queryByRole('radiogroup', { name: 'Wariant wyglądu' })).not.toBeInTheDocument();
    expect(screen.getByText(`kolor: ${theme.primaryColor}`)).toBeInTheDocument();
  });

  it('starts with the first variant and switches the whole look', () => {
    renderWith(variants);
    expect(screen.getByRole('radiogroup', { name: 'Wariant wyglądu' })).toBeInTheDocument();
    expect(screen.getByText('kolor: blue')).toBeInTheDocument();
    fireEvent.click(screen.getByText('B. Kolorowy'));
    expect(screen.getByText('kolor: grape')).toBeInTheDocument();
  });

  it('shows a variant in its own color scheme (the app is dark, a light variant to compare)', () => {
    renderWith([...variants, { key: 'l', label: 'L. Jasny', theme: { primaryColor: 'indigo' }, colorScheme: 'light' }]);
    expect(screen.getByText('tryb: dark')).toBeInTheDocument();
    fireEvent.click(screen.getByText('L. Jasny'));
    expect(screen.getByText('tryb: light')).toBeInTheDocument();
  });
});
