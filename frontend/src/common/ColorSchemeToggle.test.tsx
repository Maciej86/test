import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { I18nextProvider } from 'react-i18next';
import { theme } from '@app/shared/theme';
import { i18n } from '../test/render';
import { ColorSchemeToggle } from './ColorSchemeToggle';

describe('ColorSchemeToggle', () => {
  it('switches between light and dark', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <ColorSchemeToggle />
        </MantineProvider>
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Włącz ciemny motyw' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Włącz jasny motyw' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light');
  });
});
