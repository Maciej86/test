import { Badge, Button, Card, Group, Stack, Table, Text } from '@mantine/core';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, type LeaveRequestStatus, type MyLeaveRequest } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DateText } from '../../../common/DateText';
import { myLeavePdfUrl } from '../my-leave.api';

/** Kolory statusów z księgi wyglądu (DESIGN.md, „Statusy”). */
export const STATUS_COLOR: Record<LeaveRequestStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  cancelled: 'red',
};

/** Czy wniosek liczy się do puli (czeka albo zatwierdzony). */
const countsToPool = (r: MyLeaveRequest) => r.status === 'pending' || r.status === 'approved';

/** „4 z zaległego, 2 z puli 2026”, „nie odejmuje z puli” albo „nie liczą się do puli”. */
export const splitText = (t: TFunction, r: MyLeaveRequest): string => {
  if (!countsToPool(r)) return t('split_returned');
  if (r.daysFromCarried + r.daysFromAnnual === 0) return t('split_none');
  return [
    r.daysFromCarried > 0 ? t('split_carried', { count: r.daysFromCarried }) : null,
    r.daysFromAnnual > 0 ? t('split_annual', { count: r.daysFromAnnual, year: r.poolYear }) : null,
  ]
    .filter(Boolean)
    .join(t('check_and'));
};

/** Termin: jeden dzień bez „–”. */
export const Dates = ({ from, to }: { from: string; to: string }) => (
  <>
    <DateText value={from} />
    {to !== from && <> – <DateText value={to} /></>}
  </>
);

const StatusCell = ({ r }: { r: MyLeaveRequest }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Stack gap={4} align="flex-start">
      <Badge color={STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
      {r.decidedByName && r.decidedAt && (
        <Text size="xs" c="dimmed">
          {r.decidedByName}, <DateText value={r.decidedAt} />
        </Text>
      )}
      {r.rejectReason && <Text size="xs" maw={280}>{t('quoted', { text: r.rejectReason })}</Text>}
    </Stack>
  );
};

export interface RowActions {
  onWithdraw: (r: MyLeaveRequest) => void;
}

const Actions = ({ r, onWithdraw }: RowActions & { r: MyLeaveRequest }) => {
  const { t } = useTranslation('my-leave');
  if (r.status === 'approved') {
    return (
      <Button component="a" href={myLeavePdfUrl(r.id)} target="_blank" rel="noopener" size="xs" variant="subtle" leftSection={<ButtonIcon action="print" size={14} />}>
        {t('print')}
      </Button>
    );
  }
  if (r.status !== 'pending') return null;
  return (
    <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={() => onWithdraw(r)}>
      {t('withdraw')}
    </Button>
  );
};

/** Wnioski na komputerze: tabela. */
export const RequestsTable = ({ rows, onWithdraw }: RowActions & { rows: MyLeaveRequest[] }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('col_dates')}</Table.Th>
            <Table.Th>{t('col_type')}</Table.Th>
            <Table.Th>{t('col_days')}</Table.Th>
            <Table.Th>{t('col_status')}</Table.Th>
            <Table.Th>{t('col_created')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>
                <Text fw={600} style={{ whiteSpace: 'nowrap' }}><Dates from={r.dateFrom} to={r.dateTo} /></Text>
                {r.comment && <Text size="xs" c="dimmed" maw={260} lineClamp={2}>{r.comment}</Text>}
              </Table.Td>
              <Table.Td>{r.leaveTypeName}</Table.Td>
              <Table.Td>
                <Text fw={600}>{r.workingDays}</Text>
                <Text size="xs" c="dimmed">{splitText(t, r)}</Text>
              </Table.Td>
              <Table.Td><StatusCell r={r} /></Table.Td>
              <Table.Td c="dimmed"><DateText value={r.createdAt} /></Table.Td>
              <Table.Td ta="right"><Actions r={r} onWithdraw={onWithdraw} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy wniosek to karta zamiast wiersza tabeli. */
export const RequestCards = ({ rows, onWithdraw }: RowActions & { rows: MyLeaveRequest[] }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((r) => (
        <Card key={r.id} withBorder padding="md">
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={0}>
                <Text fw={600}><Dates from={r.dateFrom} to={r.dateTo} /></Text>
                <Text size="sm" c="dimmed">{r.leaveTypeName}, {t('days', { count: r.workingDays })}</Text>
                <Text size="xs" c="dimmed">{splitText(t, r)}</Text>
              </Stack>
              <Badge color={STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
            </Group>
            {r.comment && <Text size="sm" c="dimmed">{r.comment}</Text>}
            {r.rejectReason && <Text size="sm">{t('quoted', { text: r.rejectReason })}</Text>}
            <Group justify="flex-end"><Actions r={r} onWithdraw={onWithdraw} /></Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};
