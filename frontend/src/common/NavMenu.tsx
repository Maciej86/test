import { NavLink } from '@mantine/core';
import { NavLink as RouterLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { activeNavKey, flattenNav, translateKey, visibleNav, type NavItem, type SessionUser } from '@app/shared';
import { NavIcon } from './icons';

interface Props {
  items: NavItem[];
  user: SessionUser | null;
}

export function NavMenu({ items, user }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const visible = visibleNav(items, user);
  const activeKey = activeNavKey(flattenNav(visible), pathname);
  const render = (list: NavItem[]) =>
    list.map((item) => (
      <NavLink
        key={item.key}
        component={RouterLink}
        to={item.path}
        end
        label={translateKey(t, item.label)}
        leftSection={<NavIcon name={item.icon} />}
        active={item.key === activeKey}
        defaultOpened={item.children?.some((c) => pathname.startsWith(c.path))}
      >
        {item.children ? render(item.children) : undefined}
      </NavLink>
    ));
  return <>{render(visible)}</>;
}
