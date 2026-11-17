import { useState } from 'react';
import { Badge, Button, Card, Grid, Group, Paper, Progress, SegmentedControl, Select, Stack, Table, Text, Title } from '@mantine/core';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { EmptyState } from '../../common/EmptyState';
import { PageHeader } from '../../common/PageHeader';
import { DateText } from '../../common/DateText';
import { InfoCard } from '../../common/InfoCard';
import { PrintPreview, RequestModal, WithdrawModal } from './MyLeaveModals';
import { FORM_EXAMPLES, LEAVE_TYPES, MY_REQUESTS, POOL, REQUEST_YEARS, type LeaveStatus, type MockRequest } from './data';

/** Kolory statusów z księgi wyglądu (DESIGN.md, „Statusy”). */
export const STATUS_COLOR: Record<LeaveStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  cancelled: 'red',
};

const STATES = ['list', 'empty', 'form_ok', 'form_not_enough', 'form_limit', 'form_overlap', 'form_next_year', 'withdraw', 'print'] as const;
type State = (typeof STATES)[number];
const FORM_STATE: Partial<Record<State, keyof typeof FORM_EXAMPLES>> = {
  form_ok: 'ok',
  form_not_enough: 'not_enough',
  form_limit: 'limit',
  form_overlap: 'overlap',
  form_next_year: 'next_year',
};

/**
 * Pula na rok otwarty jednym paskiem: wykorzystane, czeka na decyzję (zarezerwowane), zostało z zaległego
 * i zostało z puli rocznej. Duża liczba to dni, o które pracownik może jeszcze wnioskować.
 */
const PoolCard = () => {
  const { t } = useTranslation('my-leave');
  const total = POOL.annual + POOL.carried;
  const used = POOL.usedCarried + POOL.usedAnnual;
  const carriedLeft = POOL.carried - POOL.usedCarried;
  const annualLeft = POOL.annual - POOL.usedAnnual - POOL.pending;
  const left = carriedLeft + annualLeft;
  const pct = (d: number) => (d / total) * 100;
  const parts = [
    { key: 'used', value: used, color: 'dark.4' },
    { key: 'pending', value: POOL.pending, color: 'yellow.6' },
    { key: 'carried', value: carriedLeft, color: 'navy.3' },
    { key: 'annual', value: annualLeft, color: 'navy.6' },
  ];

  return (
    <InfoCard title={t('pool_title', { year: POOL.year })}>
      <Group gap="xs" align="baseline">
        <Text fz={40} fw={700} lh={1} c={left === 0 ? 'red.4' : undefined}>{left}</Text>
        <Text c="dimmed">{t('pool_left', { total })}</Text>
      </Group>
      <Progress.Root size={12} radius="xs" aria-label={t('pool_aria', { left, total })}>
        {parts.map((p) => <Progress.Section key={p.key} value={pct(p.value)} color={p.color} />)}
      </Progress.Root>
      <Group gap="lg" mt={4}>
        {parts.map((p) => (
          <Group key={p.key} gap={6} wrap="nowrap">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: `var(--mantine-color-${p.color.replace('.', '-')})`, display: 'inline-block' }} />
            <Text size="sm"><Text span fw={700}>{p.value}</Text> <Text span c="dimmed">{t(`legend_${p.key}`, { year: POOL.year - 1 })}</Text></Text>
          </Group>
        ))}
      </Group>
      <Text size="xs" c="dimmed">{t('pool_hint', { annual: POOL.annual, carried: POOL.carried, prev: POOL.year - 1 })}</Text>
    </InfoCard>
  );
};

/** Typy z rocznym limitem: ile dni już zajęte w tym roku (czekające i zatwierdzone). */
const LimitsCard = () => {
  const { t } = useTranslation('my-leave');
  return (
    <InfoCard title={t('limits_title', { year: POOL.year })}>
      {LEAVE_TYPES.filter((lt) => lt.limit !== null).map((lt) => (
        <Stack key={lt.id} gap={4}>
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">{lt.name}</Text>
            <Text size="sm"><Text span fw={700}>{lt.usedOfLimit}</Text> <Text span c="dimmed">{t('limit_of', { limit: lt.limit })}</Text></Text>
          </Group>
          <Progress value={(lt.usedOfLimit / lt.limit!) * 100} size={6} radius="xs" color="navy.4" />
        </Stack>
      ))}
      <Text size="xs" c="dimmed">{t('limits_hint')}</Text>
    </InfoCard>
  );
};

const DaysCell = ({ r }: { r: MockRequest }) => {
  const { t } = useTranslation('my-leave');
  const deducted = r.fromCarried + r.fromAnnual;
  return (
    <Stack gap={0}>
      <Text fw={600}>{r.days}</Text>
      {r.status === 'pending' || r.status === 'approved' ? (
        <Text size="xs" c="dimmed">
          {deducted === 0
            ? t('split_none')
            : [
                r.fromCarried > 0 ? t('split_carried', { count: r.fromCarried }) : null,
                r.fromAnnual > 0 ? t('split_annual', { count: r.fromAnnual, year: POOL.year }) : null,
              ].filter(Boolean).join(t('check_and'))}
        </Text>
      ) : (
        <Text size="xs" c="dimmed">{t('split_returned')}</Text>
      )}
    </Stack>
  );
};

const StatusCell = ({ r }: { r: MockRequest }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Stack gap={4} align="flex-start">
      <Badge color={STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
      {r.decidedBy && r.status !== 'pending' && (
        <Text size="xs" c="dimmed">
          {r.decidedBy}, <DateText value={r.decidedAt} />
        </Text>
      )}
      {r.reason && <Text size="xs" maw={280}>„{r.reason}”</Text>}
    </Stack>
  );
};

interface RowActions {
  onWithdraw: (r: MockRequest) => void;
  onPrint: (r: MockRequest) => void;
}

const Actions = ({ r, onWithdraw, onPrint }: RowActions & { r: MockRequest }) => {
  const { t } = useTranslation('my-leave');
  if (r.status === 'pending') {
    return <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={() => onWithdraw(r)}>{t('withdraw')}</Button>;
  }
  if (r.status === 'approved') {
    return <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="print" size={14} />} onClick={() => onPrint(r)}>{t('print')}</Button>;
  }
  return null;
};

const RequestsTable = ({ rows, ...actions }: RowActions & { rows: MockRequest[] }) => {
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
                <Text fw={600} style={{ whiteSpace: 'nowrap' }}>
                  <DateText value={r.from} />{r.to !== r.from && <> – <DateText value={r.to} /></>}
                </Text>
                {r.comment && <Text size="xs" c="dimmed" maw={260} lineClamp={2}>{r.comment}</Text>}
              </Table.Td>
              <Table.Td>{r.type}</Table.Td>
              <Table.Td><DaysCell r={r} /></Table.Td>
              <Table.Td><StatusCell r={r} /></Table.Td>
              <Table.Td c="dimmed"><DateText value={r.createdAt.slice(0, 10)} /></Table.Td>
              <Table.Td ta="right"><Actions r={r} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy wniosek to karta zamiast wiersza tabeli. */
const RequestCards = ({ rows, ...actions }: RowActions & { rows: MockRequest[] }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((r) => (
        <Card key={r.id} withBorder padding="md">
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={0}>
                <Text fw={600}>
                  <DateText value={r.from} />{r.to !== r.from && <> – <DateText value={r.to} /></>}
                </Text>
                <Text size="sm" c="dimmed">{r.type}, {t('days', { count: r.days })}</Text>
              </Stack>
              <Badge color={STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
            </Group>
            {r.comment && <Text size="sm" c="dimmed">{r.comment}</Text>}
            {r.reason && <Text size="sm">„{r.reason}”</Text>}
            <Group justify="flex-end"><Actions r={r} {...actions} /></Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};

const EmptyRequests = ({ onNew }: { onNew: () => void }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Paper withBorder p="xl">
      <EmptyState
        icon={CalendarDays}
        text={t('empty')}
        action={<Button leftSection={<ButtonIcon action="add" />} onClick={onNew}>{t('new_request')}</Button>}
      />
    </Paper>
  );
};

/** Czekające na górze, potem od najnowszego terminu. */
const sortRequests = (rows: MockRequest[]) =>
  [...rows].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.from.localeCompare(a.from));

export const MyLeaveMockup = () => {
  const { t } = useTranslation('my-leave');
  const [state, setState] = useState<State>('list');
  const [year, setYear] = useState<string | null>(REQUEST_YEARS[0]!);
  const [form, setForm] = useState<{ key: string; initial: (typeof FORM_EXAMPLES)[keyof typeof FORM_EXAMPLES] | null } | null>(null);
  const [withdraw, setWithdraw] = useState<MockRequest | null>(null);
  const [print, setPrint] = useState<MockRequest | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setForm(null);
    setWithdraw(null);
    setPrint(null);
    const example = FORM_STATE[s];
    if (example) setForm({ key: s, initial: FORM_EXAMPLES[example] });
    if (s === 'withdraw') setWithdraw(MY_REQUESTS.find((r) => r.status === 'pending')!);
    if (s === 'print') setPrint(MY_REQUESTS.find((r) => r.status === 'approved' && r.days > 1)!);
  };

  const rows = state === 'empty' ? [] : sortRequests(MY_REQUESTS.filter((r) => r.from.startsWith(year ?? '')));
  const actions: RowActions = { onWithdraw: setWithdraw, onPrint: setPrint };
  const openNew = () => setForm({ key: 'new', initial: null });

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
        subtitle={t('summary')}
        actions={
          <>
            <Button leftSection={<ButtonIcon action="add" />} onClick={openNew}>{t('new_request')}</Button>
          </>
        }
      />

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}><PoolCard /></Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}><LimitsCard /></Grid.Col>
      </Grid>

      <Group justify="space-between" align="flex-end" mt="md">
        <Title order={2} size="h3">{t('history')}</Title>
        <Select w={120} aria-label={t('year')} data={REQUEST_YEARS} value={year} onChange={setYear} allowDeselect={false} />
      </Group>

      {rows.length === 0 ? (
        <EmptyRequests onNew={openNew} />
      ) : (
        <>
          <RequestsTable rows={rows} {...actions} />
          <RequestCards rows={rows} {...actions} />
        </>
      )}

      {form && <RequestModal key={form.key} initial={form.initial} onClose={() => setForm(null)} />}
      <WithdrawModal request={withdraw} onClose={() => setWithdraw(null)} />
      <PrintPreview request={print} onClose={() => setPrint(null)} />
    </Stack>
  );
};
