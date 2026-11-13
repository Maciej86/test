import { ROLE_LABELS, translateKey, type Role } from '@app/shared';
import type { i18n } from 'i18next';

/**
 * Zmyślone osoby w belce makiety, po jednej na rolę z „Oglądam jako”. Nowa rola: dopisz osobę (bez niej makieta
 * pokaże nazwę roli).
 */
export const MOCK_USER_NAMES: Partial<Record<Role, string>> = {
  admin: 'Anna Nowak',
  user: 'Jan Kowalski',
};

export function mockUserName(role: Role, t: i18n['t']): string {
  return MOCK_USER_NAMES[role] ?? translateKey(t, ROLE_LABELS[role]);
}
