import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarCheck,
  CalendarRange,
  CircleCheck,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Funnel,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  Undo2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Stałe ikony przycisków: ta sama akcja ma w całej aplikacji tę samą ikonę (Zapisz = dyskietka, Usuń = kosz).
 * Nowa akcja: dopisz ją tu (we froncie i w makietach) i w docs/DESIGN.md, tabela „Ikony przycisków”.
 */
export const BUTTON_ICONS = {
  save: Save,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  cancel: X,
  confirm: Check,
  search: Search,
  filter: Funnel,
  export: Download,
  import: Upload,
  archive: Archive,
  restore: ArchiveRestore,
  back: ArrowLeft,
  send: Send,
  print: Printer,
  calendar: CalendarRange,
  refresh: RefreshCw,
  details: Eye,
  copy: Copy,
  login: LogIn,
  logout: LogOut,
  password: KeyRound,
  close_year: CalendarCheck,
  hide: EyeOff,
  unhide: Undo2,
  finish: CircleCheck,
  reopen: RotateCcw,
} as const satisfies Record<string, LucideIcon>;

export type ButtonAction = keyof typeof BUTTON_ICONS;

/** Ikona do `leftSection` przycisku: `<Button leftSection={<ButtonIcon action="save" />}>`. */
export const ButtonIcon = ({ action, size = 16 }: { action: ButtonAction; size?: number }) => {
  const Component = BUTTON_ICONS[action];
  return <Component size={size} strokeWidth={1.75} aria-hidden />;
};
