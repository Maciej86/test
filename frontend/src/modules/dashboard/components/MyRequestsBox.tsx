import { Anchor, Badge, Divider, Group, Text } from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MY_LEAVE_PATH, type EmployeeDashboard, leaveDaysText } from '@app/shared';
import { InfoCard } from '../../../common/InfoCard';
import { LeaveDates, LeaveStatusBadge } from '../../../common/LeaveRequestParts';

/** Moje wnioski czekające na decyzję i najbliższy zatwierdzony urlop. */
export const MyRequestsBox = ({ pending, next }: { pending: EmployeeDashboard['myPending']; next: EmployeeDashboard['nextLeave'] }) => {
  const { t } = useTranslation('dashboard');
  return (
    <InfoCard title={t('my_requests.title')} actions={<Anchor size="sm" component={Link} to={MY_LEAVE_PATH}>{t('my_requests.all')}</Anchor>}>
      <Text size="sm" c="dimmed">{t('my_requests.pending_title')}</Text>
      {pending.length === 0 && <Text>{t('my_requests.no_pending')}</Text>}
      {pending.map((r) => (
        <Group key={r.id} justify="space-between" wrap="nowrap">
          <Text>{r.leaveTypeName}, <LeaveDates from={r.dateFrom} to={r.dateTo} /></Text>
          <LeaveStatusBadge status="pending" />
        </Group>
      ))}
      <Divider my={4} />
      <Text size="sm" c="dimmed">{t('my_requests.next_title')}</Text>
      {next === null ? (
        <Text>{t('my_requests.no_next')}</Text>
      ) : (
        <Group justify="space-between" wrap="nowrap">
          <Text>{next.leaveTypeName}, <LeaveDates from={next.dateFrom} to={next.dateTo} /></Text>
          <Badge variant="light" color="green" style={{ flex: 'none' }}>{leaveDaysText(t, next.workingDays)}</Badge>
        </Group>
      )}
    </InfoCard>
  );
};
