import { ActionIcon, Badge, Button, Card, Group, Stack, Table, Text } from '@mantine/core';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, type ContractTypeDirection, type ContractTypeItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';

export interface RowActions {
  onEdit: (ct: ContractTypeItem) => void;
  onHide: (ct: ContractTypeItem) => void;
  onUnhide: (ct: ContractTypeItem) => void;
  onMove: (ct: ContractTypeItem, direction: ContractTypeDirection) => void;
  /** Typ, którego przywracanie właśnie trwa (przycisk się kręci i nie da się kliknąć drugi raz). */
  unhidingId: number | null;
}

interface ListProps extends RowActions {
  rows: ContractTypeItem[];
  /** Liczba widocznych typów: strzałki na brzegach. */
  visibleCount: number;
}

const NameCell = ({ ct }: { ct: ContractTypeItem }) => {
  const { t } = useTranslation('contract-types');
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
        <Text fw={600} c={ct.hidden ? 'dimmed' : undefined}>{ct.name}</Text>
        {ct.hidden && <Badge variant="outline" color="gray" size="sm">{t('hidden_badge')}</Badge>}
      </Group>
      {ct.hidden && <Text size="xs" c="dimmed">{t('hidden_hint')}</Text>}
    </Stack>
  );
};

/** „4 pracowników” albo szare „nikt”; liczą się także osoby w archiwum. */
const EmployeesText = ({ count }: { count: number }) => {
  const { t } = useTranslation('contract-types');
  return count === 0 ? <Text span inherit c="dimmed">{t('no_employees')}</Text> : <>{t('employees_count', { count })}</>;
};

/** Strzałki kolejności: ta sama kolejność jest w oknie pracownika. */
const OrderArrows = ({ ct, index, count, onMove }: { ct: ContractTypeItem; index: number; count: number; onMove: RowActions['onMove'] }) => {
  const { t } = useTranslation('contract-types');
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_up')} disabled={index === 0} onClick={() => onMove(ct, 'up')}>
        <ChevronUp size={16} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label={t('move_down')}
        disabled={index === count - 1}
        onClick={() => onMove(ct, 'down')}
      >
        <ChevronDown size={16} />
      </ActionIcon>
    </Group>
  );
};

/** Akcje wiersza; ukryć można każdy widoczny typ, także ostatni (rodzaj umowy jest nieobowiązkowy). */
const Actions = ({ ct, unhidingId, onEdit, onHide, onUnhide }: Omit<RowActions, 'onMove'> & { ct: ContractTypeItem }) => {
  const { t } = useTranslation('contract-types');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(ct)}>{t('edit')}</Button>
      {ct.hidden ? (
        <Button
          size="xs"
          variant="subtle"
          leftSection={<ButtonIcon action="unhide" size={14} />}
          loading={unhidingId === ct.id}
          onClick={() => onUnhide(ct)}
        >
          {t('unhide')}
        </Button>
      ) : (
        <Button size="xs" variant="subtle" color="gray" leftSection={<ButtonIcon action="hide" size={14} />} onClick={() => onHide(ct)}>
          {t('hide')}
        </Button>
      )}
    </Group>
  );
};

export const ContractTypesTable = ({ rows, visibleCount, onMove, ...actions }: ListProps) => {
  const { t } = useTranslation('contract-types');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={70} aria-label={t('col_order')} />
            <Table.Th>{t('col_name')}</Table.Th>
            <Table.Th>{t('col_employees')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((ct, i) => (
            <Table.Tr key={ct.id}>
              <Table.Td>{!ct.hidden && <OrderArrows ct={ct} index={i} count={visibleCount} onMove={onMove} />}</Table.Td>
              <Table.Td><NameCell ct={ct} /></Table.Td>
              <Table.Td c="dimmed"><EmployeesText count={ct.employeesCount} /></Table.Td>
              <Table.Td><Actions ct={ct} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy typ to karta zamiast wiersza tabeli. */
export const ContractTypeCards = ({ rows, visibleCount, onMove, ...actions }: ListProps) => {
  const { t } = useTranslation('contract-types');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((ct, i) => (
        <Card key={ct.id} withBorder padding="md">
          <Stack gap="xs">
            <NameCell ct={ct} />
            <Text size="sm" c="dimmed">{t('col_employees')}: <EmployeesText count={ct.employeesCount} /></Text>
            <Group justify="space-between" wrap="nowrap">
              {ct.hidden ? <span /> : <OrderArrows ct={ct} index={i} count={visibleCount} onMove={onMove} />}
              <Actions ct={ct} {...actions} />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};
