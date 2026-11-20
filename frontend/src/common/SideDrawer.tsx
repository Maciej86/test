import type { ReactNode } from 'react';
import { Drawer, Text, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';

/** Szerokość panelu z prawej (`docs/DESIGN.md`, „Podgląd z prawej”). Na telefonie cały ekran. */
export const SIDE_DRAWER_WIDTH = 540;

/**
 * Panel z prawej do oglądania albo edycji rekordu (zadanie, wniosek, podgląd z archiwum). Tytuł jak nagłówek karty,
 * krzyżyk „Zamknij”; treść (pola, przyciski) daje moduł.
 *
 *   <SideDrawer title={t('task_details')} onClose={close}>…</SideDrawer>
 */
export const SideDrawer = ({ opened = true, title, onClose, children }: {
  opened?: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const phone = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`) ?? false;
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={phone ? '100%' : SIDE_DRAWER_WIDTH}
      closeButtonProps={{ 'aria-label': t('close') }}
      title={<Text ff="heading" fw={600} size="lg">{title}</Text>}
    >
      {children}
    </Drawer>
  );
};
