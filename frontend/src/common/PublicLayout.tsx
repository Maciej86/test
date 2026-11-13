import { AppShell, Button, Group, Text } from '@mantine/core';
import { Link, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { activeNavKey, PUBLIC_NAVIGATION, translateKey, type Areas } from '@app/shared';

/**
 * Strona dla odwiedzających: menu przyklejone u góry okna, treść bez marginesów, żeby zdjęcie w nagłówku
 * strony i tła sekcji (PageSection) szły na całą szerokość. Bieżąca podstrona jest podświetlona w menu.
 */
export function PublicLayout({ areas }: { areas: Areas }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const activeKey = activeNavKey(PUBLIC_NAVIGATION, pathname);
  return (
    <AppShell header={{ height: 60 }} padding={0}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Text fw={700}>{t('app_name')}</Text>
            {PUBLIC_NAVIGATION.map((item) => (
              <Button
                key={item.key}
                component={Link}
                to={item.path}
                variant={item.key === activeKey ? 'light' : 'subtle'}
                aria-current={item.key === activeKey ? 'page' : undefined}
              >
                {translateKey(t, item.label)}
              </Button>
            ))}
          </Group>
          {(areas.account || areas.admin) && (
            <Button component={Link} to="/login">
              {t('login')}
            </Button>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
