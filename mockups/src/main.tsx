import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Notifications } from '@mantine/notifications';
import { I18nextProvider } from 'react-i18next';
import { createI18n } from '@app/shared';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@app/shared/theme.css';
import './appearance/variants.css';
import { ThemeVariantProvider } from './appearance/ThemeVariants';
import { THEME_VARIANTS } from './appearance/variants';
import { MockupApp } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={createI18n()}>
      <ThemeVariantProvider variants={THEME_VARIANTS}>
        <Notifications />
        <MockupApp />
      </ThemeVariantProvider>
    </I18nextProvider>
  </StrictMode>,
);
