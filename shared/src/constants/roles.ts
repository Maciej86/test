/** Role w aplikacji. Zmieniane w /stepkit:start po wywiadzie. */
export const ROLES = ['admin', 'employee'] as const;

export type Role = (typeof ROLES)[number];

/** Klucze tekstów z shared/locales/pl/common.json. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'common.roles.admin',
  employee: 'common.roles.employee',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
