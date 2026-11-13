import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { Notifications } from '@mantine/notifications';
import { I18nextProvider } from 'react-i18next';
import { createI18n } from '@app/shared';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@app/shared/theme.css';
import { App } from './App';
import { NOTIFICATION_AUTOCLOSE_MS } from './config/constants';
import { createQueryClient } from './core/api/queryClient';
import { AuthProvider } from './core/auth/AuthProvider';
import { colorSchemeProps, theme } from '@app/shared/theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={createI18n()}>
      <MantineProvider theme={theme} {...colorSchemeProps()}>
        <Notifications autoClose={NOTIFICATION_AUTOCLOSE_MS} />
        <QueryClientProvider client={createQueryClient()}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </MantineProvider>
    </I18nextProvider>
  </StrictMode>,
);
