import { ActionIcon, Badge, Button, Card, Group, Stack, Table, Text, Tooltip } from '@mantine/core';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, type LeaveTypeDirection, type LeaveTypeItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';

export interface RowActions {
  onEdit: (lt: LeaveTypeItem) => void;
  onHide: (lt: LeaveTypeItem) => void;
  onUnhide: (lt: LeaveTypeItem) => void;
  onMove: (lt: LeaveTypeItem, direction: LeaveTypeDirection) => void;
  /** Typ, którego przywracanie właśnie trwa (przycisk się kręci i nie da się kliknąć drugi raz). */
  unhidingId: number | null;
}

interface ListProps extends RowActions {
  rows: LeaveTypeItem[];
  /** Liczba widocznych typów: strzałki na brzegach i blokada ukrycia ostatniego. */
  visibleCount: number;
}

const DeductsBadge = ({ deducts }: { deducts: boolean }) => {
  const { t } = useTranslation('leave-types');
  return <Badge variant="light" color={deducts ? 'navy' : 'gray'}>{deducts ? t('deducts_yes') : t('deducts_no')}</Badge>;
};

const NameCell = ({ lt }: { lt: LeaveTypeItem }) => {
  const { t } = useTranslation('leave-types');
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
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
const OrderArrows = ({ lt, index, count, onMove }: { lt: LeaveTypeItem; index: number; count: number; onMove: RowActions['onMove'] }) => {
  const { t } = useTranslation('leave-types');
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_up')} disabled={index === 0} onClick={() => onMove(lt, 'up')}>
        <ChevronUp size={16} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label={t('move_down')}
        disabled={index === count - 1}
        onClick={() => onMove(lt, 'down')}
      >
        <ChevronDown size={16} />
      </ActionIcon>
    </Group>
  );
};

const Actions = ({ lt, visibleCount, unhidingId, onEdit, onHide, onUnhide }: Omit<RowActions, 'onMove'> & { lt: LeaveTypeItem; visibleCount: number }) => {
  const { t } = useTranslation('leave-types');
  const last = !lt.hidden && visibleCount <= 1;
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(lt)}>{t('edit')}</Button>
      {lt.hidden ? (
        <Button
          size="xs"
          variant="subtle"
          leftSection={<ButtonIcon action="unhide" size={14} />}
          loading={unhidingId === lt.id}
          onClick={() => onUnhide(lt)}
        >
          {t('unhide')}
        </Button>
      ) : (
        <Tooltip label={t('hide_last')} disabled={!last} multiline w={260}>
          <span>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<ButtonIcon action="hide" size={14} />}
              disabled={last}
              onClick={() => onHide(lt)}
            >
              {t('hide')}
            </Button>
          </span>
        </Tooltip>
      )}
    </Group>
  );
};

export const LeaveTypesTable = ({ rows, visibleCount, onMove, ...actions }: ListProps) => {
  const { t } = useTranslation('leave-types');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={70} aria-label={t('col_order')} />
            <Table.Th>{t('col_name')}</Table.Th>
            <Table.Th>{t('col_deducts')}</Table.Th>
            <Table.Th>{t('col_limit')}</Table.Th>
            <Table.Th ta="right">{t('col_requests')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((lt, i) => (
            <Table.Tr key={lt.id}>
              <Table.Td>{!lt.hidden && <OrderArrows lt={lt} index={i} count={visibleCount} onMove={onMove} />}</Table.Td>
              <Table.Td><NameCell lt={lt} /></Table.Td>
              <Table.Td><DeductsBadge deducts={lt.deductsPool} /></Table.Td>
              <Table.Td c={lt.hidden ? 'dimmed' : undefined}><LimitText limit={lt.yearlyLimit} /></Table.Td>
              <Table.Td ta="right" c="dimmed">{lt.requestsCount}</Table.Td>
              <Table.Td><Actions lt={lt} visibleCount={visibleCount} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy typ to karta zamiast wiersza tabeli. */
export const LeaveTypeCards = ({ rows, visibleCount, onMove, ...actions }: ListProps) => {
  const { t } = useTranslation('leave-types');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((lt, i) => (
        <Card key={lt.id} withBorder padding="md">
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <NameCell lt={lt} />
              <DeductsBadge deducts={lt.deductsPool} />
            </Group>
            <Text size="sm" c="dimmed">
              {t('col_limit')}: <LimitText limit={lt.yearlyLimit} />
            </Text>
            <Text size="sm" c="dimmed">{t('requests_count', { count: lt.requestsCount })}</Text>
            <Group justify="space-between" wrap="nowrap">
              {lt.hidden ? <span /> : <OrderArrows lt={lt} index={i} count={visibleCount} onMove={onMove} />}
              <Actions lt={lt} visibleCount={visibleCount} {...actions} />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};
