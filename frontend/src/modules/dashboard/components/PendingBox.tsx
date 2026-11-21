import { Anchor, Badge, Box, Group, Text } from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LEAVE_REQUESTS_PATH, formatDate, leaveRequestPath, type AdminDashboard, leaveDaysText } from '@app/shared';
import { InfoCard } from '../../../common/InfoCard';
import { LeaveDates } from '../../../common/LeaveRequestParts';
import { daysUntil } from './daysUntil';
import { RowLink } from './RowLink';

/** Na żółto, gdy do początku urlopu zostało tyle dni lub mniej. */
const SOON_DAYS = 7;

/** Wnioski czekające na decyzję (od najwcześniejszego początku), z liczbą wszystkich obok tytułu. */
export const PendingBox = ({ pending, today }: { pending: AdminDashboard['pending']; today: string }) => {
  const { t } = useTranslation('dashboard');
  const startsText = (left: number) => {
    if (left < 0) return t('pending.started');
    if (left === 0) return t('pending.starts_today');
    return t('pending.starts_in', { count: left });
  };
  return (
    <InfoCard
      title={
        <Group gap="xs">
          {t('pending.title')}
          {pending.total > 0 && <Badge variant="light" color="yellow" size="lg" data-testid="pending-count">{pending.total}</Badge>}
        </Group>
      }
      actions={<Anchor size="sm" component={Link} to={LEAVE_REQUESTS_PATH}>{t('pending.all')}</Anchor>}
    >
      {pending.items.length === 0 && <Text c="dimmed">{t('pending.empty')}</Text>}
      {pending.items.map((r) => {
        const left = daysUntil(r.dateFrom, today);
        const soon = left <= SOON_DAYS;
        return (
          <RowLink key={r.id} to={leaveRequestPath(r.id)}>
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Box miw={0}>
                <Text fw={600} truncate>{r.employeeName}</Text>
                <Text size="sm">{r.leaveTypeName}, <LeaveDates from={r.dateFrom} to={r.dateTo} /></Text>
                <Text size="xs" c="dimmed">
                  {t('pending.submitted', { date: formatDate(r.createdAt) })},{' '}
                  <Text span inherit c={soon ? 'yellow.4' : undefined} fw={soon ? 600 : undefined} data-soon={soon}>{startsText(left)}</Text>
                </Text>
              </Box>
              <Badge variant="light" color="gray" style={{ flex: 'none' }}>{leaveDaysText(t, r.workingDays, r.dayCount)}</Badge>
            </Group>
          </RowLink>
        );
      })}
    </InfoCard>
  );
};
