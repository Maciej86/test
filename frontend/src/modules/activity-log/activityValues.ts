import type { TFunction } from 'i18next';
import { ROLE_LABELS, formatDate, isRole, translateKey, type ActivityArea } from '@app/shared';

/** Pola z datą RRRR-MM-DD. */
const DATE_FIELDS = new Set(['date_from', 'date_to', 'due_date', 'hired_on']);
/** Pola tak/nie (z bazy także 0/1). */
const BOOL_FIELDS = new Set(['finished', 'deducts_pool']);
/** Pola z imionami osób (serwer zamienił numery; null = konto usunięte). */
const PEOPLE_FIELDS = new Set(['assignee_ids', 'member_ids', 'added_member_id']);

const isEmpty = (value: unknown) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

/**
 * Wartość pola z historii zmian do pokazania („przed → po”); null = brak wartości (ekran pokazuje „brak”).
 * Statusy, kolumny i role biorą tekst z modułów, z których pochodzą.
 */
export const formatChangeValue = (field: string, value: unknown, t: TFunction): string | null => {
  if (field === 'yearly_limit' && isEmpty(value)) return t('values.no_limit');
  if (isEmpty(value)) return null;
  if (field === 'password') return t('values.password_reset');
  if (field === 'status') return translateKey(t, `my-leave.status.${String(value)}`);
  if (field === 'column_key') return translateKey(t, `tasks.column.${String(value)}`);
  if (field === 'role' && isRole(value)) return translateKey(t, ROLE_LABELS[value]);
  if (DATE_FIELDS.has(field)) return formatDate(String(value)) ?? String(value);
  if (BOOL_FIELDS.has(field)) return t(value ? 'values.yes' : 'values.no');
  if (PEOPLE_FIELDS.has(field)) {
    const list = Array.isArray(value) ? value : [value];
    return list.map((name) => (typeof name === 'string' ? name : t('values.deleted_account'))).join(', ');
  }
  return String(value);
};

/** Krótki opis rekordu z zapamiętanych danych (`context.<obszar>`); obszar bez opisu albo brak danych → null. */
export const formatContext = (area: ActivityArea, context: Record<string, string | number> | null, t: TFunction): string | null => {
  if (!context) return null;
  switch (area) {
    case 'leave_requests':
      if (!context.leaveType) return null;
      return t('context.leave_requests', {
        leaveType: context.leaveType,
        from: formatDate(String(context.from)) ?? '',
        to: formatDate(String(context.to)) ?? '',
        days: context.days,
      });
    case 'tasks':
      return context.project ? t('context.tasks', { project: context.project }) : null;
    case 'leave_pools':
      return context.year ? t('context.leave_pools', { year: context.year }) : null;
    case 'users':
      return isRole(context.role) ? translateKey(t, ROLE_LABELS[context.role]) : null;
    default:
      return null;
  }
};
