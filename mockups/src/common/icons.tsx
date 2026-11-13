import {
  Archive,
  CalendarCheck,
  CalendarDays,
  Circle,
  History,
  House,
  SquareKanban,
  Tags,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Ikony nawigacji z Lucide (https://lucide.dev/icons/). Klucz to nazwa ikony ze strony Lucide, np. 'calendar-days'.
 * Nowa ikona w navigation.config.ts: dopisz ją tutaj (w makietach i we froncie), np. 'calendar-days': CalendarDays.
 */
export const NAV_ICONS: Record<string, LucideIcon> = {
  house: House,
  user: User,
  'calendar-days': CalendarDays,
  'calendar-check': CalendarCheck,
  'square-kanban': SquareKanban,
  users: Users,
  tags: Tags,
  history: History,
  archive: Archive,
};

export function NavIcon({ name }: { name: string }) {
  const Component = NAV_ICONS[name] ?? Circle;
  return <Component size={18} strokeWidth={1.75} />;
}
