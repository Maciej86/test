import { useState } from 'react';
import { ActionIcon, Badge, Button, Card, ColorSwatch, Group, Paper, SegmentedControl, Stack, Switch, Table, Text } from '@mantine/core';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { PageHeader } from '../../common/PageHeader';
import { notify } from '../../common/notify';
import { HideModal, LeaveTypeModal } from './LeaveTypeModals';
import { LEAVE_TYPES, type MockLeaveType } from './data';

const STATES = ['list', 'with_hidden', 'name_taken', 'edit_used'] as const;
type State = (typeof STATES)[number];

interface RowActions {
  onEdit: (lt: MockLeaveType) => void;
  onHide: (lt: MockLeaveType) => void;
}

const DeductsBadge = ({ deducts }: { deducts: boolean }) => {
  const { t } = useTranslation('leave-types');
  return <Badge variant="light" color={deducts ? 'navy' : 'gray'}>{deducts ? t('deducts_yes') : t('deducts_no')}</Badge>;
};

const DayCountText = ({ lt }: { lt: MockLeaveType }) => {
  const { t } = useTranslation('leave-types');
  return <Text span inherit c={lt.hidden ? 'dimmed' : undefined}>{t(`day_count.${lt.dayCount}`)}</Text>;
};

const ApprovalBadge = ({ approval }: { approval: boolean }) => {
  const { t } = useTranslation('leave-types');
  return <Badge variant="light" color={approval ? 'navy' : 'gray'}>{approval ? t('approval_yes') : t('approval_no')}</Badge>;
};

const NameCell = ({ lt }: { lt: MockLeaveType }) => {
  const { t } = useTranslation('leave-types');
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
        <ColorSwatch color={`var(--mantine-color-${lt.color}-8)`} size={12} radius={2} aria-label={t(`colors.${lt.color}`)} />
        <Text fw={600} c={lt.hidden ? 'dimmed' : undefined}>{lt.name}</Text>
        {lt.hidden && <Badge variant="outline" color="gray" size="sm">{t('hidden_badge')}</Badge>}
      </Group>
      {lt.hidden && <Text size="xs" c="dimmed">{t('hidden_hint')}</Text>}
    </Stack>
  );
};

const LimitText = ({ limit }: { limit: number | null }) => {
  const { t } = useTranslation('leave-types');
  return limit === null ? <Text span inherit c="dimmed">{t('no_limit')}</Text> : <>{t('limit_days', { count: limit })}</>;
};

/** Strzałki kolejności: ta sama kolejność jest w formularzu wniosku pracownika. */
const OrderArrows = ({ index, count }: { index: number; count: number }) => {
  const { t } = useTranslation('leave-types');
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_up')} disabled={index === 0}>
        <ChevronUp size={16} />
      </ActionIcon>
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_down')} disabled={index === count - 1}>
        <ChevronDown size={16} />
      </ActionIcon>
    </Group>
  );
};

const Actions = ({ lt, onEdit, onHide }: RowActions & { lt: MockLeaveType }) => {
  const { t } = useTranslation('leave-types');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(lt)}>{t('edit')}</Button>
      {lt.hidden ? (
        <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="unhide" size={14} />} onClick={() => notify.success(t('unhidden_done'))}>
          {t('unhide')}
        </Button>
      ) : (
        <Button size="xs" variant="subtle" color="gray" leftSection={<ButtonIcon action="hide" size={14} />} onClick={() => onHide(lt)}>
          {t('hide')}
        </Button>
      )}
    </Group>
  );
};

const LeaveTypesTable = ({ rows, visibleCount, ...actions }: RowActions & { rows: MockLeaveType[]; visibleCount: number }) => {
  const { t } = useTranslation('leave-types');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={70} aria-label={t('col_order')} />
            <Table.Th>{t('col_name')}</Table.Th>
            <Table.Th>{t('col_day_count')}</Table.Th>
            <Table.Th>{t('col_approval')}</Table.Th>
            <Table.Th>{t('col_deducts')}</Table.Th>
            <Table.Th>{t('col_limit')}</Table.Th>
            <Table.Th ta="right">{t('col_requests')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((lt, i) => (
            <Table.Tr key={lt.id}>
              <Table.Td>{!lt.hidden && <OrderArrows index={i} count={visibleCount} />}</Table.Td>
              <Table.Td><NameCell lt={lt} /></Table.Td>
              <Table.Td><DayCountText lt={lt} /></Table.Td>
              <Table.Td><ApprovalBadge approval={lt.approval} /></Table.Td>
              <Table.Td><DeductsBadge deducts={lt.deducts} /></Table.Td>
              <Table.Td c={lt.hidden ? 'dimmed' : undefined}><LimitText limit={lt.limit} /></Table.Td>
              <Table.Td ta="right" c="dimmed">{lt.requests}</Table.Td>
              <Table.Td><Actions lt={lt} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy typ to karta zamiast wiersza tabeli. */
const LeaveTypeCards = ({ rows, visibleCount, ...actions }: RowActions & { rows: MockLeaveType[]; visibleCount: number }) => {
  const { t } = useTranslation('leave-types');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((lt, i) => (
        <Card key={lt.id} withBorder padding="md">
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <NameCell lt={lt} />
              <DeductsBadge deducts={lt.deducts} />
            </Group>
            <Group gap="xs"><ApprovalBadge approval={lt.approval} /></Group>
            <Text size="sm" c="dimmed">
              {t('col_day_count')}: <DayCountText lt={lt} />
            </Text>
            <Text size="sm" c="dimmed">
              {t('col_limit')}: <LimitText limit={lt.limit} />
            </Text>
            <Text size="sm" c="dimmed">{t('requests_count', { count: lt.requests })}</Text>
            <Group justify="space-between" wrap="nowrap">
              {lt.hidden ? <span /> : <OrderArrows index={i} count={visibleCount} />}
              <Actions lt={lt} {...actions} />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};

export const LeaveTypesMockup = () => {
  const { t } = useTranslation('leave-types');
  const [state, setState] = useState<State>('list');
  const [showHidden, setShowHidden] = useState(false);
  const [form, setForm] = useState<{ leaveType: MockLeaveType | null } | null>(null);
  const [hide, setHide] = useState<MockLeaveType | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setShowHidden(s === 'with_hidden');
    if (s === 'name_taken') setForm({ leaveType: null });
    if (s === 'edit_used') setForm({ leaveType: LEAVE_TYPES[1]! });
  };

  const visible = LEAVE_TYPES.filter((lt) => !lt.hidden);
  const hidden = LEAVE_TYPES.filter((lt) => lt.hidden);
  const rows = showHidden ? [...visible, ...hidden] : visible;
  const actions: RowActions = { onEdit: (lt) => setForm({ leaveType: lt }), onHide: setHide };

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
        subtitle={t('summary', { visible: visible.length, hidden: hidden.length })}
        actions={
          <>
            <Switch
              label={t('show_hidden', { count: hidden.length })}
              checked={showHidden}
              onChange={(e) => setShowHidden(e.currentTarget.checked)}
            />
            <Button leftSection={<ButtonIcon action="add" />} onClick={() => setForm({ leaveType: null })}>{t('add')}</Button>
          </>
        }
      />

      <LeaveTypesTable rows={rows} visibleCount={visible.length} {...actions} />
      <LeaveTypeCards rows={rows} visibleCount={visible.length} {...actions} />

      {form && (
        <LeaveTypeModal
          key={`${form.leaveType?.id ?? 'new'}-${state}`}
          leaveType={form.leaveType}
          nameTaken={state === 'name_taken' && form.leaveType === null}
          onClose={() => setForm(null)}
        />
      )}
      <HideModal leaveType={hide} onClose={() => setHide(null)} />
    </Stack>
  );
};
