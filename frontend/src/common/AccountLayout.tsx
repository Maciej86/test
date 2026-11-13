import { ACCOUNT_NAVIGATION } from '@app/shared';
import { SideMenuLayout } from './SideMenuLayout';

/** Konto użytkownika: menu z boku jak w panelu (na telefonie pod przyciskiem). */
export function AccountLayout() {
  return <SideMenuLayout items={ACCOUNT_NAVIGATION} />;
}
