import type { Router } from 'express';
import { ACCOUNT_NAVIGATION, NAVIGATION, rolesFor, type Role } from '@app/shared';
import { requireRole } from './requireRole';

/**
 * Podpina trasy modułu pod /api/<key> z rolami jego pozycji w navigation.config.ts (panel albo konto), żeby menu
 * i API miały te same uprawnienia. Moduł bez pozycji w nawigacji (np. email) podaje role jawnie.
 * Węższe uprawnienia pojedynczych tras (np. „usuwa tylko admin”): requireRole przy tej trasie.
 */
export function mountModule(api: Router, key: string, routes: Router, roles?: Role[]): void {
  const allowed = roles ?? rolesFor(key, [...NAVIGATION, ...ACCOUNT_NAVIGATION]);
  if (!allowed || allowed.length === 0) {
    throw new Error(`mountModule: moduł "${key}" nie ma pozycji w navigation.config.ts ani podanych ról`);
  }
  mountedModules.set(key, allowed);
  api.use(`/${key}`, requireRole(...allowed), routes);
}

/** Moduły podpięte przez mountModule z ich rolami; test routeProtection.test.ts sprawdza na nich 401 i 403. */
export const mountedModules = new Map<string, Role[]>();
