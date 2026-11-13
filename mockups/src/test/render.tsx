import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { createI18n } from '@app/shared';
import { theme } from '@app/shared/theme';

const i18n = createI18n();

export function renderWithProviders(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MantineProvider theme={theme}>{ui}</MantineProvider>
    </I18nextProvider>,
  );
}

export function renderRoutes(routes: RouteObject[], path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = renderWithProviders(<RouterProvider router={router} />);
  return { ...result, router };
}

export { i18n };
