// Makiety i prawdziwa aplikacja mają wyglądać tak samo: oba miejsca biorą motyw z @app/shared/theme.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { useMantineTheme } from '@mantine/core';
import { theme } from '@app/shared/theme';
import { renderWithProviders } from './render';

function ThemeProbe() {
  const current = useMantineTheme();
  return <span>{`${current.primaryColor}|${current.defaultRadius}`}</span>;
}

describe('shared theme', () => {
  it('is used by the test renderer', () => {
    renderWithProviders(<ThemeProbe />);
    expect(screen.getByText(`${theme.primaryColor}|${theme.defaultRadius}`)).toBeInTheDocument();
  });

  it('is used by the app entry point together with the shared styles', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
    expect(main).toContain("from '@app/shared/theme'");
    expect(main).toContain("import '@app/shared/theme.css'");
    expect(main).toMatch(/<MantineProvider theme=\{theme\}/);
  });
});
