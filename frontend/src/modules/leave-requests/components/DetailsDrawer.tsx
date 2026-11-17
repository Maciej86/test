import type { ReactNode } from 'react';
import { Alert, Button, Divider, Drawer, Group, Paper, Progress, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LeaveRequestDetails } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DataState } from '../../../common/DataState';
import { DateText } from '../../../common/DateText';
import { LeaveDates, LeaveStatusBadge, leaveSplitText } from '../../../common/LeaveRequestParts';
import { leaveRequestPdfUrl, type useLeaveRequest } from '../leave-requests.api';
import { isLate, type RowActions } from './LeaveRequestsTable';
import { TeamStrip } from './TeamStrip';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <Group gap="md" align="flex-start" wrap="nowrap">
    <Text size="sm" c="dimmed" w={130} style={{ flex: 'none' }}>{label}</Text>
    <Text size="sm" component="div" style={{ flex: 1 }}>{children}</Text>
  </Group>
);

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
        <Text size="xs" c="dimmed">{t('pool_line', { used: pool.used, pending: pool.pending, carried: pool.carriedDays })}</Text>
        {r.status === 'pending' && <Text size="sm">{r.deductsPool ? t('pool_after_approve', { count: pool.left }) : t('pool_no_deduct')}</Text>}
      </Stack>
    </Paper>
  );
};

const Content = ({ r, actions }: { r: LeaveRequestDetails; actions: Omit<RowActions, 'onDetails'> }) => {
  const { t } = useTranslation('leave-requests');
  const active = r.status === 'pending' || r.status === 'approved';
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
        <Text c="dimmed">{r.leaveTypeName}, {t('days', { count: r.workingDays })} ({leaveSplitText(t, r)})</Text>
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
        {r.comment && <Row label={t('comment')}>{r.comment}</Row>}
        <Row label={t('submitted')}><DateText value={r.createdAt} withTime /></Row>
        {r.decidedByName && r.decidedAt && (
          <Row label={t(`decided_${r.status}`)}>{r.decidedByName}, <DateText value={r.decidedAt} withTime /></Row>
        )}
        {r.decisionReason && <Row label={t('reason')}>{t('my-leave:quoted', { text: r.decisionReason })}</Row>}
      </Stack>

      {r.status === 'pending' && (
        <>
          <Divider />
          <Group justify="flex-end">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={() => actions.onReject(r)}>{t('reject')}</Button>
            <Button color="green" leftSection={<ButtonIcon action="confirm" />} onClick={() => actions.onApprove(r)}>{t('approve')}</Button>
          </Group>
        </>
      )}
      {r.status === 'approved' && (
        <>
          <Divider />
          <Group justify="flex-end">
            {r.canCancel && (
              <Button variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" />} onClick={() => actions.onCancel(r)}>{t('cancel_leave')}</Button>
            )}
            <Button component="a" href={leaveRequestPdfUrl(r.id)} target="_blank" rel="noopener" variant="default" leftSection={<ButtonIcon action="print" />}>
              {t('pdf')}
            </Button>
          </Group>
        </>
      )}
    </Stack>
  );
};

/**
 * Szczegóły wniosku z prawej (na telefonie na cały ekran). Otwiera je adres `/admin/leave-requests/:id`: klik
 * w wiersz, link z e-maila i z dzwonka. Tu administrator decyduje.
 */
export const DetailsDrawer = ({ id, details, onClose, ...actions }: Omit<RowActions, 'onDetails'> & {
  id: number | null;
  details: ReturnType<typeof useLeaveRequest>;
  onClose: () => void;
}) => {
  const { t } = useTranslation('leave-requests');
  const phone = useMediaQuery('(max-width: 48em)');
  return (
    <Drawer
      opened={id !== null}
      onClose={onClose}
      position="right"
      size={phone ? '100%' : 'xl'}
      title={id !== null ? t('details_title', { id }) : ''}
      closeButtonProps={{ 'aria-label': t('close') }}
    >
      <DataState query={details}>{details.data && <Content r={details.data} actions={actions} />}</DataState>
    </Drawer>
  );
};
