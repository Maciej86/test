import { NAVIGATION } from '@app/shared';
import { SideMenuLayout } from './SideMenuLayout';

/** Panel administracyjny: menu z boku (na telefonie pod przyciskiem). */
export function AppLayout() {
  return <SideMenuLayout items={NAVIGATION} />;
}
