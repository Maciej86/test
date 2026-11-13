import { createContext, useContext } from 'react';
import { ROLES, type Role } from '@app/shared';

export const MockupRoleContext = createContext<Role>(ROLES[0]);

/** Rola wybrana w pasku „Oglądam jako:”. Ekrany makiety pokazują dzięki niej, co widzi która rola. */
export function useMockupRole(): Role {
  return useContext(MockupRoleContext);
}
