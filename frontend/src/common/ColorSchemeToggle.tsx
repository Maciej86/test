import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Przełącznik jasny/ciemny motyw; widoczny, gdy COLOR_SCHEME_TOGGLE w shared/src/theme.ts jest włączony. */
export function ColorSchemeToggle() {
  const { t } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();
  const dark = useComputedColorScheme('light') === 'dark';
  const label = dark ? t('color_scheme.to_light') : t('color_scheme.to_dark');
  return (
    <ActionIcon variant="default" size="lg" aria-label={label} title={label} onClick={() => setColorScheme(dark ? 'light' : 'dark')}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </ActionIcon>
  );
}
