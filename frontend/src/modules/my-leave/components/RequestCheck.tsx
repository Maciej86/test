import { leaveDaysText } from '@app/shared';
import type { ReactNode } from 'react';
import { Alert, Text } from '@mantine/core';
import { AlertTriangle, CalendarRange, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LeaveRequestCheck } from '@app/shared';
import { LeaveDates } from '../../../common/LeaveRequestParts';

/** Wynik sprawdzenia w oknie: brak terminu, „Do” przed „Od” (błąd przy polu) albo wynik `checkLeaveRequest`. */
export type RequestCheckState = { kind: 'empty' } | { kind: 'order' } | LeaveRequestCheck;

const Blocked = ({ title, children, warning = false }: { title: string; children: ReactNode; warning?: boolean }) => (
  <Alert
    color={warning ? 'yellow' : 'red'}
    variant="light"
    icon={warning ? <Info size={18} /> : <AlertTriangle size={18} />}
    title={title}
  >
    {children}
  </Alert>
);

/** Ramka pod terminem: ile dni i skąd się wezmą, albo co blokuje złożenie i jak to naprawić. */
export const RequestCheck = ({ check, poolYear, typeName }: { check: RequestCheckState; poolYear: number; typeName: string }) => {
  const { t } = useTranslation('my-leave');
  switch (check.kind) {
    case 'empty':
      return <Text size="sm" c="dimmed">{t('check_empty')}</Text>;
    case 'order':
      return null;
    case 'ok':
      return (
        <Alert color="navy" variant="light" icon={<CalendarRange size={18} />} title={leaveDaysText(t, check.workingDays)}>
          {check.leftAfter === null
            ? t('check_no_pool')
            : [
                check.fromCarried > 0 ? t('check_from_carried', { count: check.fromCarried }) : null,
                check.fromAnnual > 0 ? t('check_from_annual', { count: check.fromAnnual, year: poolYear }) : null,
              ]
                .filter(Boolean)
                .join(t('check_and')) + t('check_left_after', { count: check.leftAfter })}
        </Alert>
      );
    case 'past_date':
      return <Blocked title={t('check_past_date_title')}>{t('check_past_date')}</Blocked>;
    case 'pool_not_ready':
      return (
        <Blocked warning title={t('check_other_year_title', { year: check.year })}>
          {t('check_other_year', { year: check.year, open: check.openYear })}
        </Blocked>
      );
    case 'year_closed':
      return <Blocked warning title={t('check_year_closed_title', { year: check.year })}>{t('check_year_closed', { open: poolYear })}</Blocked>;
    case 'overlap':
      return (
        <Blocked title={t('check_overlap_title')}>
          {t('check_overlap', { type: check.other.leaveTypeName, status: t(`status.${check.other.status}`) })}{' '}
          <LeaveDates from={check.other.dateFrom} to={check.other.dateTo} />.
        </Blocked>
      );
    case 'no_working_days':
      return <Blocked title={t('check_no_days_title')}>{t('check_no_days')}</Blocked>;
    case 'limit_exceeded':
      return (
        <Blocked title={t('check_limit_title', { type: typeName })}>
          {t('check_limit', { limit: check.limit, used: check.used, days: check.days, year: poolYear })}
        </Blocked>
      );
    case 'not_enough_days':
      return (
        <Blocked title={t('check_not_enough_title', { count: check.days })}>
          {t('check_not_enough', { left: check.left, pending: check.pending })}
        </Blocked>
      );
  }
};
