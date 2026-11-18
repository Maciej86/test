import { useState } from 'react';
import { Badge, Button, Card, Group, Paper, SegmentedControl, Select, Stack, Switch, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { OrderArrows } from '../../common/OrderArrows';
import { PageHeader } from '../../common/PageHeader';
import { notify } from '../../common/notify';
import { ContractTypeModal, HideModal } from './ContractTypeModals';
import { CONTRACT_TYPES, type MockContractType } from './data';

const STATES = ['list', 'with_hidden', 'name_taken', 'edit_used', 'employee_field', 'empty'] as const;
type State = (typeof STATES)[number];

interface RowActions {
  onEdit: (ct: MockContractType) => void;
  onHide: (ct: MockContractType) => void;
}

const NameCell = ({ ct }: { ct: MockContractType }) => {
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

const EmployeesText = ({ count }: { count: number }) => {
  const { t } = useTranslation('contract-types');
  return count === 0 ? <Text span inherit c="dimmed">{t('no_employees')}</Text> : <>{t('employees_count', { count })}</>;
};

const Actions = ({ ct, onEdit, onHide }: RowActions & { ct: MockContractType }) => {
  const { t } = useTranslation('contract-types');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(ct)}>{t('edit')}</Button>
      {ct.hidden ? (
        <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="unhide" size={14} />} onClick={() => notify.success(t('unhidden_done'))}>
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

const ContractTypesTable = ({ rows, visibleCount, ...actions }: RowActions & { rows: MockContractType[]; visibleCount: number }) => {
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
              <Table.Td>{!ct.hidden && <OrderArrows index={i} count={visibleCount} />}</Table.Td>
              <Table.Td><NameCell ct={ct} /></Table.Td>
              <Table.Td c="dimmed"><EmployeesText count={ct.employees} /></Table.Td>
              <Table.Td><Actions ct={ct} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każdy typ to karta zamiast wiersza tabeli. */
const ContractTypeCards = ({ rows, visibleCount, ...actions }: RowActions & { rows: MockContractType[]; visibleCount: number }) => {
  const { t } = useTranslation('contract-types');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((ct, i) => (
        <Card key={ct.id} withBorder padding="md">
          <Stack gap="xs">
            <NameCell ct={ct} />
            <Text size="sm" c="dimmed">{t('col_employees')}: <EmployeesText count={ct.employees} /></Text>
            <Group justify="space-between" wrap="nowrap">
              {ct.hidden ? <span /> : <OrderArrows index={i} count={visibleCount} />}
              <Actions ct={ct} {...actions} />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};

/** Podgląd pola „Rodzaj umowy” z okna pracownika: widoczne typy w ustalonej kolejności; ukryty tylko jako obecna wartość. */
const EmployeeFieldPreview = () => {
  const { t } = useTranslation('contract-types');
  const hiddenCurrent = CONTRACT_TYPES.find((ct) => ct.hidden)!;
  const data = [
    ...CONTRACT_TYPES.filter((ct) => !ct.hidden).map((ct) => ({ value: String(ct.id), label: ct.name })),
    { value: String(hiddenCurrent.id), label: `${hiddenCurrent.name} ${t('employee_hidden_suffix')}` },
  ];
  return (
    <Card withBorder padding="md" maw={420}>
      <Stack gap="xs">
        <Text size="sm" c="dimmed">{t('employee_preview')}</Text>
        <Select
          label={t('employee_field')}
          placeholder={t('employee_field_placeholder')}
          data={data}
          defaultValue={String(hiddenCurrent.id)}
          clearable
          defaultDropdownOpened
          comboboxProps={{ withinPortal: false }}
        />
      </Stack>
    </Card>
  );
};

export const ContractTypesMockup = () => {
  const { t } = useTranslation('contract-types');
  const [state, setState] = useState<State>('list');
  const [showHidden, setShowHidden] = useState(false);
  const [form, setForm] = useState<{ contractType: MockContractType | null } | null>(null);
  const [hide, setHide] = useState<MockContractType | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setShowHidden(s === 'with_hidden');
    if (s === 'name_taken') setForm({ contractType: null });
    if (s === 'edit_used') setForm({ contractType: CONTRACT_TYPES[0]! });
  };

  const all = state === 'empty' ? [] : CONTRACT_TYPES;
  const visible = all.filter((ct) => !ct.hidden);
  const hidden = all.filter((ct) => ct.hidden);
  const rows = showHidden ? [...visible, ...hidden] : visible;
  const actions: RowActions = { onEdit: (ct) => setForm({ contractType: ct }), onHide: setHide };

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
            {hidden.length > 0 && (
              <Switch
                label={t('show_hidden', { count: hidden.length })}
                checked={showHidden}
                onChange={(e) => setShowHidden(e.currentTarget.checked)}
              />
            )}
            <Button leftSection={<ButtonIcon action="add" />} onClick={() => setForm({ contractType: null })}>{t('add')}</Button>
          </>
        }
      />

      {state === 'employee_field' ? (
        <EmployeeFieldPreview />
      ) : rows.length === 0 ? (
        <Card withBorder padding="xl">
          <Stack align="center" gap="sm">
            <Text c="dimmed" ta="center">{t('empty')}</Text>
            <Button leftSection={<ButtonIcon action="add" />} onClick={() => setForm({ contractType: null })}>{t('add')}</Button>
          </Stack>
        </Card>
      ) : (
        <>
          <ContractTypesTable rows={rows} visibleCount={visible.length} {...actions} />
          <ContractTypeCards rows={rows} visibleCount={visible.length} {...actions} />
        </>
      )}

      {form && (
        <ContractTypeModal
          key={`${form.contractType?.id ?? 'new'}-${state}`}
          contractType={form.contractType}
          nameTaken={state === 'name_taken' && form.contractType === null}
          onClose={() => setForm(null)}
        />
      )}
      <HideModal contractType={hide} onClose={() => setHide(null)} />
    </Stack>
  );
};
