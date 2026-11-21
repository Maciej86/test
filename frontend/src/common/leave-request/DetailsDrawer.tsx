import { Alert, Button, Divider, Group, Paper, Progress, Stack, Text } from '@mantine/core';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { calendarPath, type LeaveRequestDetails, leaveDaysText } from '@app/shared';
import { ButtonIcon } from '../ButtonIcon';
import { DataState } from '../DataState';
import { DateText } from '../DateText';
import { DetailRow } from '../DetailRow';
import { SideDrawer } from '../SideDrawer';
import { LeaveDates, LeaveStatusBadge, leaveSplitText } from '../LeaveRequestParts';
import { isLate, leaveRequestPdfUrl, type LeaveRequestActions, type useLeaveRequest } from '../../core/leaveRequestDecisions';
import { TeamStrip } from './TeamStrip';

/** Pula roku wniosku: pasek (wykorzystane, czeka, zostało) i ile zostanie po zatwierdzeniu. */
const PoolBox = ({ r, pool }: { r: LeaveRequestDetails; pool: NonNullable<LeaveRequestDetails['pool']> }) => {
  const { t } = useTranslation('leave-requests');
  const total = pool.annualDays + pool.carriedDays;
  const pct = (d: number) => (total === 0 ? 0 : (d / total) * 100);
  return (
    <Paper withBorder p="md" bg="var(--app-panel-background)">
      <Stack gap={6}>
        <Group justify="space-between" align="baseline">
          <Text size="sm" fw={600}>{t('pool_title', { year: pool.year })}</Text>
          <Text size="sm"><Text span fw={700} fz="lg">{pool.left}</Text> <Text span c="dimmed">{t('pool_of', { total })}</Text></Text>
        </Group>
        <Progress.Root size={8} radius="xs" aria-label={t('pool_aria', { left: pool.left, total })}>
          <Progress.Section value={pct(pool.used)} color="dark.4" />
          <Progress.Section value={pct(pool.pending)} color="yellow.6" />
          <Progress.Section value={pct(pool.left)} color="navy.6" />
        </Progress.Root>
        <Text size="xs" c="dimmed">{t(r.status === 'approved' ? 'pool_line_approved' : 'pool_line', { used: pool.used, pending: pool.pending, carried: pool.carriedDays })}</Text>
        {r.status === 'pending' && <Text size="sm">{r.deductsPool ? t('pool_after_approve', { count: pool.left }) : t('pool_no_deduct')}</Text>}
      </Stack>
    </Paper>
  );
};

const Content = ({ r, actions, showInCalendar }: { r: LeaveRequestDetails; actions: LeaveRequestActions; showInCalendar: boolean }) => {
  const { t } = useTranslation('leave-requests');
  const active = r.status === 'pending' || r.status === 'approved';
  const calendarLink = showInCalendar && (
    <Button component={Link} to={calendarPath(r.dateFrom)} variant="subtle" leftSection={<ButtonIcon action="calendar" />}>{t('show_in_calendar')}</Button>
  );
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Group justify="space-between" align="flex-start">
          <Text fw={700} fz="xl">
            {r.employeeName}
            {r.employeeArchived && <Text span size="sm" c="dimmed"> ({t('employee_archived')})</Text>}
          </Text>
          <LeaveStatusBadge status={r.status} />
        </Group>
        <Text fz="lg"><LeaveDates from={r.dateFrom} to={r.dateTo} /></Text>
        <Text c="dimmed">{r.leaveTypeName}, {leaveDaysText(t, r.workingDays, r.dayCount)} ({leaveSplitText(t, r)})</Text>
      </Stack>

      {isLate(r) && <Alert color="yellow" variant="light" icon={<Clock size={18} />}>{t('late_hint')}</Alert>}

      {active && (
        <Stack gap="xs">
          <Text fw={600}>{t('strip_title')}</Text>
          <TeamStrip request={r} others={r.others} />
        </Stack>
      )}
      {r.pool && <PoolBox r={r} pool={r.pool} />}

      <Stack gap={8}>
        {r.comment && <DetailRow label={t('comment')}>{r.comment}</DetailRow>}
        <DetailRow label={t('submitted')}><DateText value={r.createdAt} withTime /></DetailRow>
        {r.decidedByName && r.decidedAt && (
          <DetailRow label={t(`decided_${r.status}`)}>{r.decidedByName}, <DateText value={r.decidedAt} withTime /></DetailRow>
        )}
        {r.autoApproved && r.status === 'approved' && <Text size="sm" c="dimmed">{t('approved_auto')}</Text>}
        {r.decisionReason && <DetailRow label={t('reason')}>{t('my-leave:quoted', { text: r.decisionReason })}</DetailRow>}
      </Stack>

      {r.status === 'pending' && (
        <>
          <Divider />
          <Group justify={calendarLink ? 'space-between' : 'flex-end'}>
            {calendarLink}
            <Group gap="xs">
              <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={() => actions.onReject(r)}>{t('reject')}</Button>
              <Button color="green" leftSection={<ButtonIcon action="confirm" />} onClick={() => actions.onApprove(r)}>{t('approve')}</Button>
            </Group>
          </Group>
        </>
      )}
      {r.status === 'approved' && (
        <>
          <Divider />
          <Group justify={calendarLink ? 'space-between' : 'flex-end'}>
            {calendarLink}
            <Group gap="xs">
              {r.canCancel && (
                <Button variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" />} onClick={() => actions.onCancel(r)}>{t('cancel_leave')}</Button>
              )}
              <Button component="a" href={leaveRequestPdfUrl(r.id)} target="_blank" rel="noopener" variant="default" leftSection={<ButtonIcon action="print" />}>
                {t('pdf')}
              </Button>
            </Group>
          </Group>
        </>
      )}
    </Stack>
  );
};

/**
 * Szczegóły wniosku z prawej (na telefonie na cały ekran). Otwiera je adres `/admin/leave-requests/:id`: klik
 * w wiersz, link z e-maila i z dzwonka; w Kalendarzu klik w pasek. Tu administrator decyduje.
 */
export const DetailsDrawer = ({ id, details, onClose, showInCalendar = false, ...actions }: LeaveRequestActions & {
  id: number | null;
  /** Przycisk „Pokaż w kalendarzu” (Wnioski urlopowe; w samym Kalendarzu niepotrzebny). */
  showInCalendar?: boolean;
  details: ReturnType<typeof useLeaveRequest>;
  onClose: () => void;
}) => {
  const { t } = useTranslation('leave-requests');
  return (
    <SideDrawer opened={id !== null} title={id !== null ? t('details_title', { id }) : ''} onClose={onClose}>
      <DataState query={details}>{details.data && <Content r={details.data} actions={actions} showInCalendar={showInCalendar} />}</DataState>
    </SideDrawer>
  );
};
