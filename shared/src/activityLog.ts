import type { ActivityArea, ActivityTone } from './constants/activityLog';

/** Opis wpisu: klucz `actions.<kind>` w activity-log.json i kolor ikony. */
export interface ActivityDescription {
  kind: string;
  tone: ActivityTone;
}

type Changes = Record<string, { before: unknown; after: unknown } | undefined>;

const GENERIC: ActivityDescription = { kind: 'generic', tone: 'neutral' };
const of = (kind: string, tone: ActivityTone): ActivityDescription => ({ kind, tone });

const LEAVE_STATUS: Record<string, ActivityDescription> = {
  approved: of('leave_approve', 'positive'),
  rejected: of('leave_reject', 'negative'),
  withdrawn: of('leave_withdraw', 'muted'),
  cancelled: of('leave_cancel', 'negative'),
};

/** Wspólne akcje obszarów, które mają tylko dodanie, zmianę, archiwum i usunięcie. */
const BASIC_TONES: Record<string, ActivityTone> = {
  create: 'positive',
  update: 'neutral',
  archive: 'negative',
  restore: 'positive',
  delete: 'negative',
  hide: 'muted',
  unhide: 'positive',
};
const basic = (prefix: string, action: string, allowed: string[]): ActivityDescription =>
  allowed.includes(action) ? of(`${prefix}_${action}`, BASIC_TONES[action]!) : GENERIC;

/**
 * Opis wpisu historii zmian z obszaru, akcji i zmian. Bezosobowo („Zatwierdzenie wniosku”), bo aplikacja nie zna
 * formy osoby. Kolor: zielony dodanie, zatwierdzenie, przywrócenie; czerwony odrzucenie, anulowanie, usunięcie;
 * szary wycofanie i ukrycie; granatowy reszta.
 */
export const describeActivity = (area: ActivityArea, action: string, changes: Changes): ActivityDescription => {
  switch (area) {
    case 'leave_requests':
      if (action === 'create') return of('leave_create', 'neutral');
      if (action === 'status') return LEAVE_STATUS[String(changes.status?.after)] ?? GENERIC;
      return GENERIC;
    case 'leave_pools':
      if (action === 'update' && changes.closed_year) return of('pool_close_year', 'neutral');
      return basic('pool', action, ['create', 'update']);
    case 'tasks':
      if (action === 'status' && changes.column_key) return of('task_move', 'neutral');
      if (action === 'status' && changes.finished) return changes.finished.after ? of('task_finish', 'positive') : of('task_unfinish', 'muted');
      return basic('task', action, ['create', 'update', 'archive', 'restore', 'delete']);
    case 'projects':
      return basic('project', action, ['create', 'update', 'delete']);
    case 'users':
      // Własne hasło z „Moje konto” (`changed`) albo hasło tymczasowe od administratora (`reset`).
      if (action === 'update' && changes.password?.after === 'changed') return of('user_own_password', 'neutral');
      if (action === 'update' && changes.password) return of('user_password', 'neutral');
      if (action === 'update' && changes.role) return of('user_role', 'neutral');
      return basic('user', action, ['create', 'update', 'archive', 'restore', 'delete']);
    case 'leave_types':
      return basic('leave_type', action, ['create', 'update', 'hide', 'unhide']);
    case 'contract_types':
      return basic('contract_type', action, ['create', 'update', 'hide', 'unhide']);
    default:
      return GENERIC;
  }
};
