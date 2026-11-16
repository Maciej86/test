/** Pracownicy i pule dni urlopu (moduł Pracownicy). */

/** Pula dni na rok: 0–60, domyślnie 26. */
export const ANNUAL_DAYS_MAX = 60;
export const ANNUAL_DAYS_DEFAULT = 26;
/**
 * Zaległe dni: górna granica tylko przeciw literówce. „Zamknij rok” przenosi wszystkie niewykorzystane dni bez limitu,
 * więc po kilku latach zaległe mogą przekroczyć 120, a okno „Edytuj” musi dać się zapisać (SMALLINT w bazie).
 */
export const CARRIED_DAYS_MAX = 999;

/** Rodzaj umowy pracownika (nieobowiązkowy); teksty w employees.json, `contract_types`. */
export const CONTRACT_TYPES = ['employment', 'mandate', 'specific_work', 'b2b'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  employment: 'employees.contract_types.employment',
  mandate: 'employees.contract_types.mandate',
  specific_work: 'employees.contract_types.specific_work',
  b2b: 'employees.contract_types.b2b',
};

/** Kolejność listy: po nazwisku albo po liczbie pozostałych dni. */
export const EMPLOYEE_SORTS = ['name', 'days_left'] as const;
export type EmployeeSort = (typeof EMPLOYEE_SORTS)[number];

/** Klucze błędów serwera modułu (teksty w shared/locales/pl/employees.json, sekcja server). */
export const EMPLOYEE_MESSAGES = {
  loginTaken: 'validation.login_taken',
  loginTakenArchived: 'employees.server.login_taken_archived',
  emailTaken: 'validation.email_taken',
  emailTakenArchived: 'employees.server.email_taken_archived',
  ownRole: 'employees.server.own_role',
  archiveSelf: 'employees.server.archive_self',
  alreadyArchived: 'employees.server.already_archived',
  notArchived: 'employees.server.not_archived',
  yearNotOpen: 'employees.server.year_not_open',
  yearTooEarly: 'employees.server.year_too_early',
} as const;
