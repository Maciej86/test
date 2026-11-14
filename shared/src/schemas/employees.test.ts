import { describe, expect, it } from 'vitest';
import { closeYearSchema, employeeCreateSchema, employeeUpdateSchema, employeesListQuerySchema } from './employees';

const base = { name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', email: '', role: 'employee', annualDays: 26, carriedDays: 0 };
const issue = (r: { error?: { issues: { message: string; path: PropertyKey[] }[] } }, field: string) =>
  r.error?.issues.find((i) => i.path.join('.') === field)?.message;

describe('employee schemas', () => {
  it('name: 1 character → name_too_short, 2 and 150 ok, 151 → too_long', () => {
    expect(issue(employeeUpdateSchema.safeParse({ ...base, name: 'J' }), 'name')).toBe('validation.name_too_short');
    expect(employeeUpdateSchema.safeParse({ ...base, name: 'Jo' }).success).toBe(true);
    expect(employeeUpdateSchema.safeParse({ ...base, name: 'a'.repeat(150) }).success).toBe(true);
    expect(issue(employeeUpdateSchema.safeParse({ ...base, name: 'a'.repeat(151) }), 'name')).toBe('validation.too_long');
  });

  it('login with capitals and spaces around is saved lowercase', () => {
    expect(employeeUpdateSchema.parse({ ...base, login: ' Ewa.Mazur@Firma.pl ' }).login).toBe('ewa.mazur@firma.pl');
  });

  it('empty notification e-mail becomes null', () => {
    expect(employeeUpdateSchema.parse(base).email).toBeNull();
    expect(employeeUpdateSchema.parse({ ...base, email: 'Jan@Gmail.com' }).email).toBe('jan@gmail.com');
  });

  it('role employee without annualDays → required on annualDays; admin without pool ok', () => {
    const noPool = { name: 'Anna Nowak', login: 'anna@firma.pl', email: '', role: 'employee' };
    expect(issue(employeeUpdateSchema.safeParse(noPool), 'annualDays')).toBe('validation.required');
    expect(employeeUpdateSchema.safeParse({ ...noPool, role: 'admin' }).success).toBe(true);
    expect(employeeUpdateSchema.parse({ ...noPool, annualDays: 20 }).carriedDays).toBe(0);
  });

  it('carriedDays 120 ok, 121 → max; carried 70 ok', () => {
    expect(employeeUpdateSchema.safeParse({ ...base, carriedDays: 70 }).success).toBe(true);
    expect(employeeUpdateSchema.safeParse({ ...base, carriedDays: 120 }).success).toBe(true);
    expect(issue(employeeUpdateSchema.safeParse({ ...base, carriedDays: 121 }), 'carriedDays')).toBe('validation.max');
    expect(issue(employeeUpdateSchema.safeParse({ ...base, annualDays: 61 }), 'annualDays')).toBe('validation.max');
  });

  it('create: password Urlop2026 → password_rules', () => {
    expect(issue(employeeCreateSchema.safeParse({ ...base, password: 'Urlop2026' }), 'password')).toBe('validation.password_rules');
    expect(employeeCreateSchema.safeParse({ ...base, password: 'Urlop-2026' }).success).toBe(true);
  });

  it('closeYearSchema: pools with annualDays 61 → max', () => {
    expect(closeYearSchema.safeParse({ year: 2026, pools: [{ userId: 2, annualDays: 26 }] }).success).toBe(true);
    expect(issue(closeYearSchema.safeParse({ year: 2026, pools: [{ userId: 2, annualDays: 61 }] }), 'pools.0.annualDays')).toBe('validation.max');
  });

  it('list query: role=kot → no role filter; sort=password → list_sort', () => {
    expect(employeesListQuerySchema.parse({ role: 'kot' }).role).toBeUndefined();
    expect(employeesListQuerySchema.parse({ role: 'admin' }).role).toBe('admin');
    expect(employeesListQuerySchema.parse({}).sort).toBe('name');
    expect(employeesListQuerySchema.safeParse({ sort: 'password' }).error?.issues[0]?.message).toBe('validation.list_sort');
  });
});
