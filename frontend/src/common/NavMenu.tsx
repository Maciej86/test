import { NavLink } from '@mantine/core';
import { NavLink as RouterLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { activeNavKey, flattenNav, translateKey, visibleNav, type NavItem, type SessionUser } from '@app/shared';
import { NavIcon } from './icons';

interface Props {
  items: NavItem[];
  user: SessionUser | null;
}

export const NavMenu = ({ items, user }: Props) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const visible = visibleNav(items, user);
  const activeKey = activeNavKey(flattenNav(visible), pathname);
  const render = (list: NavItem[]) =>
    list.map((item) =>
      item.children ? (
        // Grupa (np. „Ustawienia”) nie ma własnej strony: tylko rozwija swoje pozycje. Klucz zmienia się, gdy bieżąca
        // pozycja trafi do grupy później (projekty z serwera), więc grupa rozwija się wtedy sama.
        <NavLink
          key={`${item.key}-${item.children.some((c) => c.key === activeKey) ? 'open' : 'closed'}`}
          component="button"
          type="button"
          label={item.text ?? translateKey(t, item.label)}
          leftSection={<NavIcon name={item.icon} />}
          defaultOpened={item.children.some((c) => c.key === activeKey)}
        >
          {render(item.children)}
        </NavLink>
      ) : (
        <NavLink
          key={item.key}
          component={RouterLink}
          to={item.path}
          end
          label={item.text ?? translateKey(t, item.label)}
          leftSection={<NavIcon name={item.icon} />}
          active={item.key === activeKey}
        />
      ),
    );
  return <>{render(visible)}</>;
};
