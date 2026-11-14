import { z } from 'zod';
import { ROLES, type Role } from '../constants/roles';
import { USER_NAME_MAX } from '../constants/login';
import { ANNUAL_DAYS_MAX, CARRIED_DAYS_MAX, EMPLOYEE_SORTS, USER_NAME_MIN, type EmployeeSort } from '../constants/employees';
import { email, login, newPassword, optionalField, text, wholeNumber } from './fields';
import { listQuerySchema, type ListResponse } from './list';

const employeeFields = {
  name: text(USER_NAME_MAX).pipe(z.string().min(USER_NAME_MIN, 'validation.name_too_short')),
  login,
  email: optionalField(email),
  role: z.enum(ROLES, { error: 'validation.required' }),
  annualDays: wholeNumber(0, ANNUAL_DAYS_MAX).optional(),
  carriedDays: wholeNumber(0, CARRIED_DAYS_MAX).optional(),
};

/** Pula wymagana tylko przy roli Pracownik (administrator nie ma puli). */
function requirePool(v: { role: Role; annualDays?: number }, ctx: z.RefinementCtx) {
  if (v.role === 'employee' && v.annualDays === undefined) {
    ctx.addIssue({ code: 'custom', path: ['annualDays'], message: 'validation.required' });
  }
}

/** Brak zaległych dni = 0. */
const defaultCarried = <T extends { carriedDays?: number }>(v: T) => ({ ...v, carriedDays: v.carriedDays ?? 0 });

/** Okno „Edytuj” (PUT /api/employees/:id). */
export const employeeUpdateSchema = z.object(employeeFields).superRefine(requirePool).transform(defaultCarried);
/** Okno „Dodaj pracownika” (POST /api/employees): to samo i hasło tymczasowe. */
export const employeeCreateSchema = z
  .object({ ...employeeFields, password: newPassword })
  .superRefine(requirePool)
  .transform(defaultCarried);
/** Okno „Nowe hasło” (POST /api/employees/:id/password). */
export const employeePasswordSchema = z.object({ password: newPassword });
/** Okno „Zamknij rok” (POST /api/employees/close-year). */
export const closeYearSchema = z.object({
  year: z.number().int(),
  pools: z.array(z.object({ userId: z.number().int().positive(), annualDays: wholeNumber(0, ANNUAL_DAYS_MAX) })),
});
/** Parametry listy z adresu: strona, szukanie, kolejność i filtr roli. */
export const employeesListQuerySchema = listQuerySchema(EMPLOYEE_SORTS).extend({
  role: z.enum(ROLES).optional().catch(undefined),
});

export type EmployeeInput = z.input<typeof employeeUpdateSchema>;
export type EmployeeData = z.output<typeof employeeUpdateSchema>;
export type EmployeeCreateInput = z.input<typeof employeeCreateSchema>;
export type EmployeeCreateData = z.output<typeof employeeCreateSchema>;
export type EmployeePasswordInput = z.infer<typeof employeePasswordSchema>;
export type CloseYearInput = z.infer<typeof closeYearSchema>;
export type EmployeesListQuery = { page: number; search: string; sort: EmployeeSort; dir: 'asc' | 'desc'; role?: Role };

/** Pula dni na rok otwarty, policzona przez serwer (zaległe schodzą pierwsze). */
export interface EmployeePool {
  year: number;
  annualDays: number;
  carriedDays: number;
  usedDays: number;
  pendingDays: number;
  leftDays: number;
  leftCarriedDays: number;
}

export interface EmployeeListItem {
  id: number;
  name: string;
  login: string;
  email: string | null;
  role: Role;
  isMe: boolean;
  /** null dla administratora. */
  pool: EmployeePool | null;
}

export interface EmployeesListResponse extends ListResponse<EmployeeListItem> {
  openYear: number;
  counts: { all: number; admins: number };
}

export interface CloseYearPreview {
  year: number;
  nextYear: number;
  canClose: boolean;
  pendingRequests: number;
  rows: { userId: number; name: string; left: number; annualDays: number }[];
}

/** Błąd 409 przy zajętym loginie lub e-mailu konta w archiwum: do linku „Przywróć konto”. */
export interface ArchivedUserHint {
  id: number;
  name: string;
}
