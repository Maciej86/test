// rule-ok: tylko w aplikacji, rama układu z menu (makiety mają Shell)
import { useEffect } from 'react';
import { AppShell, Burger, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ACCOUNT_NAVIGATION, findVisibleNavItem, NAVIGATION, type NavItem } from '@app/shared';
import { COLOR_SCHEME_TOGGLE } from '@app/shared/theme';
import { useAuth } from '../core/auth/AuthProvider';
import { NotificationBell } from '../modules/notifications/NotificationBell';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { IdleWarningModal } from './IdleWarningModal';
import { NavMenu } from './NavMenu';
import { UserMenu } from './UserMenu';

/**
 * Układ panelu i konta: górna belka (nazwa firmy po lewej; motyw i menu użytkownika po prawej), menu z boku, treść na
 * tle panelu. Na telefonie menu jest schowane pod przyciskiem w belce i chowa się samo po wybraniu pozycji.
 * Dzwonek powiadomień (moduł Powiadomienia) stoi między przełącznikiem motywu a menu użytkownika.
 */
export const SideMenuLayout = ({ items }: { items: NavItem[] }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const accountPath = findVisibleNavItem('my-account', [ACCOUNT_NAVIGATION, NAVIGATION], user)?.path ?? null;
  const { pathname } = useLocation();
  const [opened, { toggle, close }] = useDisclosure(false);
  useEffect(close, [pathname, close]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label={t(opened ? 'menu_close' : 'menu_open')}
            />
            <Text fw={700} truncate>
              {t('app_name')}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {COLOR_SCHEME_TOGGLE && <ColorSchemeToggle />}
            {user && <NotificationBell />}
            {user && <UserMenu name={user.name} accountPath={accountPath} onLogout={() => void logout()} />}
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        <NavMenu items={items} user={user} />
      </AppShell.Navbar>
      <AppShell.Main bg="var(--app-panel-background)">
        <Outlet />
      </AppShell.Main>
      <IdleWarningModal />
    </AppShell>
  );
};
