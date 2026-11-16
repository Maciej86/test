import { describe, expect, it } from 'vitest';
import { closeYearSchema, employeeCreateSchema, employeeUpdateSchema, employeesListQuerySchema } from '../employees';

const base = { firstName: 'Jan', lastName: 'Kowalski', login: 'jan.kowalski@firma.pl', email: '', role: 'employee', annualDays: 26, carriedDays: 0 };
const issue = (r: { error?: { issues: { message: string; path: PropertyKey[] }[] } }, field: string) =>
  r.error?.issues.find((i) => i.path.join('.') === field)?.message;

describe('employee schemas', () => {
  it('first name: 1 character → too_short, 2 and 60 ok, 61 → too_long; empty → required', () => {
    expect(issue(employeeUpdateSchema.safeParse({ ...base, firstName: 'J' }), 'firstName')).toBe('validation.too_short');
    expect(employeeUpdateSchema.safeParse({ ...base, firstName: 'Jo' }).success).toBe(true);
    expect(employeeUpdateSchema.safeParse({ ...base, firstName: 'a'.repeat(60) }).success).toBe(true);
    expect(issue(employeeUpdateSchema.safeParse({ ...base, firstName: 'a'.repeat(61) }), 'firstName')).toBe('validation.too_long');
    expect(issue(employeeUpdateSchema.safeParse({ ...base, firstName: '  ' }), 'firstName')).toBe('validation.required');
  });

  it('last name: 1 character → too_short, 2 and 80 ok, 81 → too_long; spaces trimmed', () => {
    expect(issue(employeeUpdateSchema.safeParse({ ...base, lastName: 'K' }), 'lastName')).toBe('validation.too_short');
    expect(employeeUpdateSchema.safeParse({ ...base, lastName: 'a'.repeat(80) }).success).toBe(true);
    expect(issue(employeeUpdateSchema.safeParse({ ...base, lastName: 'a'.repeat(81) }), 'lastName')).toBe('validation.too_long');
    expect(employeeUpdateSchema.parse({ ...base, lastName: ' Nowak-Kowalska ' }).lastName).toBe('Nowak-Kowalska');
  });

  it('login with capitals and spaces around is saved lowercase', () => {
    expect(employeeUpdateSchema.parse({ ...base, login: ' Ewa.Mazur@Firma.pl ' }).login).toBe('ewa.mazur@firma.pl');
  });

  it('empty notification e-mail becomes null', () => {
    expect(employeeUpdateSchema.parse(base).email).toBeNull();
    expect(employeeUpdateSchema.parse({ ...base, email: 'Jan@Gmail.com' }).email).toBe('jan@gmail.com');
  });

  it('role employee without annualDays → required on annualDays; admin without pool ok', () => {
    const noPool = { firstName: 'Anna', lastName: 'Nowak', login: 'anna@firma.pl', email: '', role: 'employee' };
    expect(issue(employeeUpdateSchema.safeParse(noPool), 'annualDays')).toBe('validation.required');
    expect(employeeUpdateSchema.safeParse({ ...noPool, role: 'admin' }).success).toBe(true);
    expect(employeeUpdateSchema.parse({ ...noPool, annualDays: 20 }).carriedDays).toBe(0);
  });

  it('carriedDays 999 ok, 1000 → max; carried 70 ok', () => {
    expect(employeeUpdateSchema.safeParse({ ...base, carriedDays: 70 }).success).toBe(true);
    expect(employeeUpdateSchema.safeParse({ ...base, carriedDays: 999 }).success).toBe(true);
    expect(issue(employeeUpdateSchema.safeParse({ ...base, carriedDays: 1000 }), 'carriedDays')).toBe('validation.max');
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

  it('administrator: hidden pool fields are ignored, even empty or too big', () => {
    const admin = { ...base, role: 'admin' };
    expect(employeeUpdateSchema.safeParse({ ...admin, annualDays: '' }).success).toBe(true);
    expect(employeeUpdateSchema.safeParse({ ...admin, annualDays: 99, carriedDays: 500 }).success).toBe(true);
    expect(employeeCreateSchema.safeParse({ ...admin, annualDays: '', password: 'Urlop-2026' }).success).toBe(true);
  });

  it('carried days after many closed years (e.g. 300) still save in the edit form', () => {
    expect(employeeUpdateSchema.safeParse({ ...base, carriedDays: 300 }).success).toBe(true);
  });

  it('hire date and contract type are optional: empty → null', () => {
    const r = employeeUpdateSchema.parse({ ...base, hiredOn: '', contractTypeId: '' });
    expect(r.hiredOn).toBeNull();
    expect(r.contractTypeId).toBeNull();
    expect(employeeUpdateSchema.parse({ ...base, contractTypeId: null }).contractTypeId).toBeNull();
    expect(employeeUpdateSchema.parse(base).contractTypeId).toBeNull();
    expect(employeeUpdateSchema.parse(base).hiredOn).toBeNull();
  });

  it('hire date 2024-03-01 and contract type 4 saved; 2024-02-30 → validation.date; type 0, 1.5 or kot → error', () => {
    const r = employeeCreateSchema.parse({ ...base, password: 'Urlop-2026', hiredOn: '2024-03-01', contractTypeId: 4 });
    expect(r).toMatchObject({ hiredOn: '2024-03-01', contractTypeId: 4 });
    expect(employeeUpdateSchema.parse({ ...base, contractTypeId: '2' }).contractTypeId).toBe(2);
    expect(issue(employeeUpdateSchema.safeParse({ ...base, hiredOn: '2024-02-30' }), 'hiredOn')).toBe('validation.date');
    for (const bad of [0, -1, 1.5, 'kot']) expect(employeeUpdateSchema.safeParse({ ...base, contractTypeId: bad }).success).toBe(false);
  });

  it('administrator also keeps hire date and contract type', () => {
    const r = employeeUpdateSchema.parse({ ...base, role: 'admin', hiredOn: '2020-01-02', contractTypeId: 1 });
    expect(r).toMatchObject({ hiredOn: '2020-01-02', contractTypeId: 1 });
  });
});
