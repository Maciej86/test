import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROLE_LABELS, translateKey, type Role } from '@app/shared';

/** Znacznik roli: administrator granatowy, pracownik szary (Pracownicy, Archiwum, Moje konto). */
export const RoleBadge = ({ role }: { role: Role }) => {
  const { t } = useTranslation();
  return <Badge variant="light" color={role === 'admin' ? 'navy' : 'gray'}>{translateKey(t, ROLE_LABELS[role])}</Badge>;
};
