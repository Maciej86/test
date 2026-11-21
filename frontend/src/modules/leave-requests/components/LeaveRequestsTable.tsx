import type { MouseEvent } from 'react';
import { Badge, Button, Card, Group, Stack, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, type LeaveRequestListItem, leaveDaysText } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DateText } from '../../../common/DateText';
import { LeaveDates, LeaveStatusBadge, leaveSplitText } from '../../../common/LeaveRequestParts';
import { isLate, leaveRequestPdfUrl, type LeaveRequestActions } from '../../../core/leaveRequestDecisions';

export interface RowActions extends LeaveRequestActions {
  onDetails: (r: LeaveRequestListItem) => void;
}

/** Klik w przycisk nie otwiera przy okazji szczegółów (klik w cały wiersz). */
const only = (fn: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  fn();
};

/** Przyciski wiersza zależne od statusu (spec, „Akcje w wierszu”). */
export const RowButtons = ({ r, onDetails, onApprove, onReject, onCancel }: RowActions & { r: LeaveRequestListItem }) => {
  const { t } = useTranslation('leave-requests');
  if (r.status === 'pending') {
    return (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        <Button size="xs" color="green" leftSection={<ButtonIcon action="confirm" size={14} />} onClick={only(() => onApprove(r))}>{t('approve')}</Button>
        <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={only(() => onReject(r))}>{t('reject')}</Button>
      </Group>
    );
  }
  if (r.status === 'approved') {
    return (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        <Button
          component="a"
          href={leaveRequestPdfUrl(r.id)}
          target="_blank"
          rel="noopener"
          size="xs"
          variant="subtle"
          leftSection={<ButtonIcon action="print" size={14} />}
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          {t('pdf')}
        </Button>
        {r.canCancel && (
          <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={only(() => onCancel(r))}>{t('cancel_leave')}</Button>
        )}
      </Group>
    );
  }
  return (
    <Group justify="flex-end">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="details" size={14} />} onClick={only(() => onDetails(r))}>{t('details')}</Button>
    </Group>
  );
};

const Employee = ({ r }: { r: LeaveRequestListItem }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Group gap={6} wrap="nowrap">
      <Text fw={600}>{r.employeeName}</Text>
      {r.employeeArchived && <Text span size="xs" c="dimmed">({t('employee_archived')})</Text>}
    </Group>
  );
};

const PoolLeft = ({ r }: { r: LeaveRequestListItem }) => {
  const { t } = useTranslation('leave-requests');
  if (!r.poolLeft) return <Text span size="sm" c="dimmed">{t('common:empty_value')}</Text>;
  return (
    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
      <Text span fw={700} c={r.poolLeft.left === 0 ? 'red.4' : undefined}>{r.poolLeft.left}</Text>{' '}
      <Text span c="dimmed">{t('pool_of', { total: r.poolLeft.total })}</Text>
    </Text>
  );
};

const Status = ({ r }: { r: LeaveRequestListItem }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Stack gap={4} align="flex-start">
      <LeaveStatusBadge status={r.status} />
      {r.decidedByName && r.decidedAt && <Text size="xs" c="dimmed">{r.decidedByName}, <DateText value={r.decidedAt} /></Text>}
      {r.autoApproved && r.status === 'approved' && <Text size="xs" c="dimmed">{t('my-leave:approved_auto')}</Text>}
      {r.decisionReason && <Text size="xs" maw={240} lineClamp={2}>{t('my-leave:quoted', { text: r.decisionReason })}</Text>}
    </Stack>
  );
};

const Late = () => {
  const { t } = useTranslation('leave-requests');
  return <Badge size="sm" variant="light" color="yellow" w="fit-content">{t('late')}</Badge>;
};

/** Tabela na komputerze; klik w wiersz otwiera szczegóły. */
export const LeaveRequestsTable = ({ rows, ...actions }: RowActions & { rows: LeaveRequestListItem[] }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH + 300} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('col_employee')}</Table.Th>
            <Table.Th>{t('col_dates')}</Table.Th>
            <Table.Th>{t('col_type')}</Table.Th>
            <Table.Th>{t('col_days')}</Table.Th>
            <Table.Th>{t('col_left')}</Table.Th>
            <Table.Th>{t('col_status')}</Table.Th>
            <Table.Th>{t('col_created')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.id} onClick={() => actions.onDetails(r)} style={{ cursor: 'pointer' }}>
              <Table.Td>
                <Employee r={r} />
                {r.comment && <Text size="xs" c="dimmed" maw={240} lineClamp={2}>{r.comment}</Text>}
              </Table.Td>
              <Table.Td>
                <Text fw={600} style={{ whiteSpace: 'nowrap' }}><LeaveDates from={r.dateFrom} to={r.dateTo} /></Text>
                {isLate(r) && <Late />}
              </Table.Td>
              <Table.Td>{r.leaveTypeName}</Table.Td>
              <Table.Td>
                <Text fw={600}>{leaveDaysText(t, r.workingDays, r.dayCount)}</Text>
                <Text size="xs" c="dimmed">{leaveSplitText(t, r)}</Text>
              </Table.Td>
              <Table.Td><PoolLeft r={r} /></Table.Td>
              <Table.Td><Status r={r} /></Table.Td>
              <Table.Td c="dimmed"><DateText value={r.createdAt} /></Table.Td>
              <Table.Td><RowButtons r={r} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy wniosek to karta; dotknięcie karty otwiera szczegóły. */
export const LeaveRequestCards = ({ rows, ...actions }: RowActions & { rows: LeaveRequestListItem[] }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((r) => (
        <Card key={r.id} withBorder padding="md" onClick={() => actions.onDetails(r)} style={{ cursor: 'pointer' }}>
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={0}>
                <Employee r={r} />
                <Text size="sm"><LeaveDates from={r.dateFrom} to={r.dateTo} /></Text>
                <Text size="sm" c="dimmed">{r.leaveTypeName}, {leaveDaysText(t, r.workingDays, r.dayCount)}</Text>
              </Stack>
              <LeaveStatusBadge status={r.status} />
            </Group>
            {isLate(r) && <Late />}
            {r.comment && <Text size="sm" c="dimmed" lineClamp={2}>{r.comment}</Text>}
            {r.decisionReason && <Text size="sm">{t('my-leave:quoted', { text: r.decisionReason })}</Text>}
            <RowButtons r={r} {...actions} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};
