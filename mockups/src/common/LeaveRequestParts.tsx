import { Badge } from '@mantine/core';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { LeaveRequestStatus } from '@app/shared';
import { DateText } from './DateText';

// Klocki wniosku urlopowego wspólne dla „Moich urlopów” i „Wniosków urlopowych”. Teksty z pliku my-leave.json.

/** Kolory statusów z księgi wyglądu (DESIGN.md, „Statusy”). */
export const LEAVE_STATUS_COLOR: Record<LeaveRequestStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  cancelled: 'red',
};

/** Znacznik statusu wniosku; nie skraca się w wąskiej kolumnie. */
export const LeaveStatusBadge = ({ status }: { status: LeaveRequestStatus }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Badge color={LEAVE_STATUS_COLOR[status]} variant="light" miw="max-content">
      {t(`status.${status}`)}
    </Badge>
  );
};

/** Termin urlopu: „26.11.2026 – 27.11.2026”, jeden dzień bez „–”. */
export const LeaveDates = ({ from, to }: { from: string; to: string }) => (
  <>
    <DateText value={from} />
    {to !== from && <> – <DateText value={to} /></>}
  </>
);

type SplitInput = { status: LeaveRequestStatus; daysFromCarried: number; daysFromAnnual: number; poolYear: number };

/** „4 z zaległego, 2 z puli 2026”, „nie odejmuje z puli” albo „nie liczą się do puli” (odrzucony, wycofany, anulowany). */
export const leaveSplitText = (t: TFunction, r: SplitInput): string => {
  if (r.status !== 'pending' && r.status !== 'approved') return t('my-leave:split_returned');
  if (r.daysFromCarried + r.daysFromAnnual === 0) return t('my-leave:split_none');
  return [
    r.daysFromCarried > 0 ? t('my-leave:split_carried', { count: r.daysFromCarried }) : null,
    r.daysFromAnnual > 0 ? t('my-leave:split_annual', { count: r.daysFromAnnual, year: r.poolYear }) : null,
  ]
    .filter(Boolean)
    .join(t('my-leave:check_and'));
};
