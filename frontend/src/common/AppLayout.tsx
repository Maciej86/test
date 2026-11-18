import { useAppNavigation } from '../core/routes/useAppNavigation';
import { SideMenuLayout } from './SideMenuLayout';

/** Panel administracyjny: menu z boku (na telefonie pod przyciskiem), z projektami w „Zadaniach”. */
export const AppLayout = () => {
  return <SideMenuLayout items={useAppNavigation()} />;
};
