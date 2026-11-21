import { useState, type MouseEvent } from 'react';
import { Badge, Button, Card, Group, Paper, SegmentedControl, Select, Stack, Table, Text } from '@mantine/core';
import { CalendarCheck, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, formatDate, leaveDaysText } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { EmptyState } from '../../common/EmptyState';
import { ListPagination } from '../../common/ListPagination';
import { notify } from '../../common/notify';
import { PageHeader } from '../../common/PageHeader';
import { SearchField } from '../../common/SearchField';
import { LeaveDates, LeaveStatusBadge } from '../../common/LeaveRequestParts';
import { ApproveModal, CancelModal, RejectModal } from '../../common/leave-request/DecisionModals';
import { DetailsDrawer } from '../../common/leave-request/DetailsDrawer';
import { TeamStrip } from '../../common/leave-request/TeamStrip';
import { isLate, splitText, toDecision, toStrip, toView } from './requestView';
import { LEAVE_TYPES, POOLS, REQUESTS, YEARS, poolLeft, type MockRequest } from './data';

const STATES = ['list', 'approve', 'details', 'details_late', 'details_approved', 'reject', 'reject_error', 'cancel', 'cancel_started', 'already_decided', 'empty'] as const;
type State = (typeof STATES)[number];

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'cancelled', 'withdrawn', 'all'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const byId = (id: number) => REQUESTS.find((r) => r.id === id)!;
const pendingCount = REQUESTS.filter((r) => r.status === 'pending').length;
const oldestPending = REQUESTS.filter((r) => r.status === 'pending').map((r) => r.createdAt).sort()[0]!;

/** Czekające: najstarsze złożone na górze (czekają najdłużej). Pozostałe: od najnowszego terminu. */
const sortRows = (rows: MockRequest[], status: StatusFilter) =>
  [...rows].sort((a, b) =>
    status === 'pending'
      ? a.createdAt.localeCompare(b.createdAt)
      : Number(b.status === 'pending') - Number(a.status === 'pending') || b.from.localeCompare(a.from),
  );

interface RowActions {
  onApprove: (r: MockRequest) => void;
  onDetails: (r: MockRequest) => void;
  onReject: (r: MockRequest) => void;
  onCancel: (r: MockRequest) => void;
}

const Actions = ({ r, onApprove, onDetails, onReject, onCancel }: RowActions & { r: MockRequest }) => {
  const { t } = useTranslation('leave-requests');
  const stop = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); fn(); };
  if (r.status === 'pending') {
    return (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        <Button size="xs" color="green" leftSection={<ButtonIcon action="confirm" size={14} />} onClick={stop(() => onApprove(r))}>
          {t('approve')}
        </Button>
        <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={stop(() => onReject(r))}>{t('reject')}</Button>
      </Group>
    );
  }
  if (r.status === 'approved') {
    return (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="print" size={14} />} onClick={stop(() => notify.success(t('pdf_mockup')))}>{t('pdf')}</Button>
        <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={stop(() => onCancel(r))}>{t('cancel_leave')}</Button>
      </Group>
    );
  }
  return (
    <Group justify="flex-end">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="details" size={14} />} onClick={stop(() => onDetails(r))}>{t('details')}</Button>
    </Group>
  );
};

const PoolCell = ({ r }: { r: MockRequest }) => {
  const { t } = useTranslation('leave-requests');
  const pool = POOLS[r.employee];
  if (!pool || !r.from.startsWith('2026')) return <Text span c="dimmed">{t('common:empty_value')}</Text>;
  const left = poolLeft(pool);
  return (
    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
      <Text span fw={700} c={left === 0 ? 'red.4' : undefined}>{left}</Text> <Text span c="dimmed">{t('pool_of', { total: pool.annual + pool.carried })}</Text>
    </Text>
  );
};

const StatusCell = ({ r }: { r: MockRequest }) => {
  return (
    <Stack gap={4} align="flex-start">
      <LeaveStatusBadge status={r.status} />
      {r.decidedBy && <Text size="xs" c="dimmed">{r.decidedBy}, <DateText value={r.decidedAt?.slice(0, 10)} /></Text>}
      {r.reason && <Text size="xs" maw={240} lineClamp={2}>„{r.reason}”</Text>}
    </Stack>
  );
};

const RequestsTable = ({ rows, ...actions }: RowActions & { rows: MockRequest[] }) => {
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
                <Text fw={600}>{r.employee}</Text>
                {r.comment && <Text size="xs" c="dimmed" maw={240} lineClamp={2}>{r.comment}</Text>}
              </Table.Td>
              <Table.Td>
                <Text fw={600} style={{ whiteSpace: 'nowrap' }}><LeaveDates from={r.from} to={r.to} /></Text>
                {isLate(r) && <Badge mt={4} size="sm" variant="light" color="yellow">{t('late')}</Badge>}
              </Table.Td>
              <Table.Td>{r.type}</Table.Td>
              <Table.Td>
                <Text fw={600}>{r.days}</Text>
                <Text size="xs" c="dimmed">{splitText(r, t)}</Text>
              </Table.Td>
              <Table.Td><PoolCell r={r} /></Table.Td>
              <Table.Td><StatusCell r={r} /></Table.Td>
              <Table.Td c="dimmed"><DateText value={r.createdAt.slice(0, 10)} /></Table.Td>
              <Table.Td><Actions r={r} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy wniosek to karta; dotknięcie karty otwiera szczegóły. */
const RequestCards = ({ rows, ...actions }: RowActions & { rows: MockRequest[] }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((r) => (
        <Card key={r.id} withBorder padding="md" onClick={() => actions.onDetails(r)} style={{ cursor: 'pointer' }}>
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={0}>
                <Text fw={600}>{r.employee}</Text>
                <Text size="sm"><LeaveDates from={r.from} to={r.to} /></Text>
                <Text size="sm" c="dimmed">{r.type}, {leaveDaysText(t, r.days)}</Text>
              </Stack>
              <LeaveStatusBadge status={r.status} />
            </Group>
            {isLate(r) && <Badge size="sm" variant="light" color="yellow" w="fit-content">{t('late')}</Badge>}
            {r.comment && <Text size="sm" c="dimmed" lineClamp={2}>{r.comment}</Text>}
            <Actions r={r} {...actions} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};

export const LeaveRequestsMockup = () => {
  const { t } = useTranslation('leave-requests');
  const [state, setState] = useState<State>('list');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [year, setYear] = useState<string | null>('2026');
  const [type, setType] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [details, setDetails] = useState<MockRequest | null>(null);
  const [reject, setReject] = useState<{ r: MockRequest; error: boolean } | null>(null);
  const [cancel, setCancel] = useState<MockRequest | null>(null);
  const [approve, setApprove] = useState<MockRequest | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setDetails(null);
    setReject(null);
    setCancel(null);
    setApprove(null);
    if (s === 'approve') setApprove(byId(24));
    if (s === 'details') setDetails(byId(24));
    if (s === 'details_late') setDetails(byId(19));
    if (s === 'details_approved') setDetails(byId(22));
    if (s === 'reject') setReject({ r: byId(21), error: false });
    if (s === 'reject_error') setReject({ r: byId(21), error: true });
    if (s === 'cancel') setCancel(byId(22));
    if (s === 'cancel_started') setCancel(byId(18));
    if (s === 'already_decided') notify.error(t('already_decided', { name: 'Marek Nowicki' }));
    if (s === 'empty') setStatus('pending');
  };

  const rows =
    state === 'empty'
      ? []
      : sortRows(
          REQUESTS.filter(
            (r) =>
              (status === 'all' || r.status === status) &&
              (status === 'pending' || r.from.startsWith(year ?? '')) &&
              (!type || r.type === type) &&
              r.employee.toLowerCase().includes(search.trim().toLowerCase()),
          ),
          status,
        );
  const statusOptions = STATUS_FILTERS.map((s) => ({
    value: s,
    label: s === 'pending' ? t('filter_pending', { count: state === 'empty' ? 0 : pendingCount }) : t(`filter.${s}`),
  }));
  const actions: RowActions = { onApprove: setApprove, onDetails: setDetails, onReject: (r) => setReject({ r, error: false }), onCancel: setCancel };

  return (
    <Stack>
      <Paper p="xs" bg="yellow.4" c="dark.9">
        <Group gap="sm">
          <Text size="sm" fw={600}>{t('mockup_state')}</Text>
          <SegmentedControl
            size="xs"
            value={state}
            onChange={(v) => changeState(v as State)}
            data={STATES.map((s) => ({ value: s, label: t(`mockup_states.${s}`) }))}
            style={{ flexWrap: 'wrap' }}
          />
        </Group>
      </Paper>

      <PageHeader
        title={t('title')}
        subtitle={state === 'empty' ? t('summary_none') : t('summary', { count: pendingCount, date: formatDate(oldestPending) })}
      />

      <SegmentedControl
        visibleFrom="sm"
        value={status}
        onChange={(v) => setStatus(v as StatusFilter)}
        data={statusOptions}
        style={{ alignSelf: 'flex-start' }}
      />
      <Select hiddenFrom="sm" aria-label={t('col_status')} data={statusOptions} value={status} onChange={(v) => v && setStatus(v as StatusFilter)} allowDeselect={false} />

      <Group gap="sm" align="flex-end">
        <SearchField label={t('search')} value={search} onChange={setSearch} w={{ base: '100%', sm: 260 }} />
        {status !== 'pending' && (
          <Select w={{ base: '100%', xs: 120 }} aria-label={t('year')} data={YEARS} value={year} onChange={setYear} allowDeselect={false} />
        )}
        <Select w={{ base: '100%', xs: 220 }} aria-label={t('type')} placeholder={t('type_all')} data={LEAVE_TYPES} value={type} onChange={setType} clearable />
      </Group>

      {rows.length === 0 ? (
        <Paper withBorder>
          {status === 'pending' && search === '' && !type ? (
            <EmptyState icon={CalendarCheck} title={t('empty_pending_title')} text={t('empty_pending')} />
          ) : (
            <EmptyState icon={Search} text={t('no_results')} />
          )}
        </Paper>
      ) : (
        <>
          <RequestsTable rows={rows} {...actions} />
          <RequestCards rows={rows} {...actions} />
          <ListPagination data={{ total: status === 'all' ? 63 : rows.length, pageSize: 25 }} page={1} onChange={() => undefined} />
        </>
      )}

      <DetailsDrawer
        request={details && toView(details, t)}
        strip={details && <TeamStrip {...toStrip(details)} />}
        onClose={() => setDetails(null)}
        onApprove={() => details && setApprove(details)}
        onReject={() => details && setReject({ r: details, error: false })}
        onCancel={() => details && setCancel(details)}
        onPdf={() => notify.success(t('pdf_mockup'))}
        onShowInCalendar={() => notify.success(t('show_in_calendar_mockup'))}
      />
      {approve && <ApproveModal key={approve.id} request={toDecision(approve)} onClose={() => { setApprove(null); setDetails(null); }} />}
      {reject && <RejectModal key={`${reject.r.id}-${reject.error}`} request={toDecision(reject.r)} showError={reject.error} onClose={() => setReject(null)} />}
      {cancel && <CancelModal key={cancel.id} request={toDecision(cancel)} onClose={() => setCancel(null)} />}
    </Stack>
  );
};
