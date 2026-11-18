import { NAVIGATION, type NavItem } from '@app/shared';
import { useAuth } from '../auth/AuthProvider';
import { useProjectNavItems } from '../../modules/tasks/useProjectNavItems';

/**
 * Menu panelu: `NAVIGATION` z pozycjami, które przychodzą z serwera, dołożonymi przed stałymi pozycjami grupy
 * (projekty w „Zadaniach”). Grupa bez widocznych pozycji znika sama w `visibleNav`.
 */
export const useAppNavigation = (): NavItem[] => {
  const { user } = useAuth();
  const extras: Record<string, NavItem[]> = { tasks: useProjectNavItems(user !== null) };
  return NAVIGATION.map((item) => (extras[item.key] ? { ...item, children: [...extras[item.key]!, ...(item.children ?? [])] } : item));
};
