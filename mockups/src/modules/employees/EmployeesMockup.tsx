import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, translateKey } from '@app/shared';
import { DateText } from '../../common/DateText';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ArchiveModal, CloseYearModal, EmployeeModal, PasswordModal } from './EmployeeModals';
import { PoolLegend, PoolMeter } from './PoolMeter';
import { EMPLOYEES, POOL_YEAR, type MockEmployee } from './data';

const STATES = ['list', 'empty', 'no_results', 'login_taken'] as const;
type State = (typeof STATES)[number];

interface RowActions {
  onEdit: (e: MockEmployee) => void;
  onPassword: (e: MockEmployee) => void;
  onArchive: (e: MockEmployee) => void;
}

const RoleBadge = ({ role }: { role: MockEmployee['role'] }) => {
  const { t } = useTranslation('employees');
  return <Badge variant="light" color={role === 'admin' ? 'navy' : 'gray'}>{t(`role.${role}`)}</Badge>;
};

const NameCell = ({ e }: { e: MockEmployee }) => {
  const { t } = useTranslation('employees');
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
        <Text fw={600}>{e.name}</Text>
        {e.isMe && <Text span size="xs" c="dimmed">({t('me')})</Text>}
      </Group>
      <Text size="sm" c="dimmed">{e.login}</Text>
    </Stack>
  );
};

const Actions = ({ e, onEdit, onPassword, onArchive }: RowActions & { e: MockEmployee }) => {
  const { t } = useTranslation('employees');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(e)}>{t('edit')}</Button>
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="password" size={14} />} onClick={() => onPassword(e)}>{t('set_password')}</Button>
      <Tooltip label={t('archive_self')} disabled={!e.isMe}>
        <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="archive" size={14} />} disabled={e.isMe} onClick={() => onArchive(e)}>
          {t('archive')}
        </Button>
      </Tooltip>
    </Group>
  );
};

/** Rodzaj umowy albo szare „brak”. */
const ContractText = ({ e }: { e: MockEmployee }) => {
  const { t } = useTranslation('employees');
  if (!e.contractType) return <Text span inherit c="dimmed">{t('no_email')}</Text>;
  return <>{e.contractType}</>;
};

const EmployeesTable = ({ rows, ...actions }: RowActions & { rows: MockEmployee[] }) => {
  const { t } = useTranslation('employees');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH + 480} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('col_name')}</Table.Th>
            <Table.Th>{t('col_role')}</Table.Th>
            <Table.Th>{t('col_hired')}</Table.Th>
            <Table.Th>{t('col_contract')}</Table.Th>
            <Table.Th>{t('col_pool', { year: POOL_YEAR })}</Table.Th>
            <Table.Th>{t('col_notify')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((e) => (
            <Table.Tr key={e.id}>
              <Table.Td><NameCell e={e} /></Table.Td>
              <Table.Td><RoleBadge role={e.role} /></Table.Td>
              <Table.Td><DateText value={e.hiredOn} /></Table.Td>
              <Table.Td><ContractText e={e} /></Table.Td>
              <Table.Td><PoolMeter pool={e.pool} /></Table.Td>
              <Table.Td>{e.notifyEmail ?? <Text span inherit c="dimmed">{t('no_email')}</Text>}</Table.Td>
              <Table.Td><Actions e={e} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

/** Na telefonie każda osoba to karta zamiast wiersza tabeli. */
const EmployeeCards = ({ rows, ...actions }: RowActions & { rows: MockEmployee[] }) => {
  const { t } = useTranslation('employees');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((e) => (
        <Card key={e.id} withBorder padding="md">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <NameCell e={e} />
              <RoleBadge role={e.role} />
            </Group>
            <PoolMeter pool={e.pool} />
            <Text size="sm" c="dimmed">
              {t('col_hired')}: <DateText value={e.hiredOn} /> · {t('col_contract')}: <ContractText e={e} />
            </Text>
            <Text size="sm" c="dimmed">{t('col_notify')}: {e.notifyEmail ?? t('no_email')}</Text>
            <Actions e={e} {...actions} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => {
  const { t } = useTranslation('employees');
  return (
    <Paper withBorder p="xl">
      <Stack align="center" gap="sm" ta="center" py="lg">
        <ThemeIcon variant="light" size={48} radius="md"><Users size={26} /></ThemeIcon>
        <Title order={3}>{t('empty_title')}</Title>
        <Text c="dimmed" maw={460}>{t('empty_text')}</Text>
        <Button mt="xs" leftSection={<ButtonIcon action="add" />} onClick={onAdd}>{t('add')}</Button>
      </Stack>
    </Paper>
  );
};

export const EmployeesMockup = () => {
  const { t } = useTranslation('employees');
  const [state, setState] = useState<State>('list');
  const [form, setForm] = useState<{ employee: MockEmployee | null } | null>(null);
  const [password, setPassword] = useState<MockEmployee | null>(null);
  const [archive, setArchive] = useState<MockEmployee | null>(null);
  const [closeYear, setCloseYear] = useState(false);

  const changeState = (s: State) => {
    setState(s);
    if (s === 'login_taken') setForm({ employee: null });
  };

  const rows = state === 'empty' ? EMPLOYEES.filter((e) => e.isMe) : state === 'no_results' ? [] : EMPLOYEES;
  const query = state === 'no_results' ? t('mockup_no_results_query') : '';
  const actions: RowActions = { onEdit: (e) => setForm({ employee: e }), onPassword: setPassword, onArchive: setArchive };

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

      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Title order={1}>{t('title')}</Title>
          <Text c="dimmed" size="sm">{t('summary', { count: rows.length || 1, admins: 1 })}</Text>
        </Stack>
        <Group gap="xs">
          <Button variant="default" leftSection={<ButtonIcon action="close_year" />} onClick={() => setCloseYear(true)} disabled={state === 'empty'}>
            {t('close_year', { year: POOL_YEAR })}
          </Button>
          <Button leftSection={<ButtonIcon action="add" />} onClick={() => setForm({ employee: null })}>{t('add')}</Button>
        </Group>
      </Group>

      <Group gap="sm" align="flex-end">
        <TextInput
          placeholder={t('search')}
          aria-label={t('search')}
          leftSection={<Search size={16} />}
          defaultValue={query}
          key={query}
          w={{ base: '100%', sm: 340 }}
        />
        <Select
          aria-label={t('filter_role')}
          data={[{ value: 'all', label: t('filter_role_all') }, { value: 'employee', label: t('role.employee') }, { value: 'admin', label: t('role.admin') }]}
          defaultValue="all"
          allowDeselect={false}
          w={{ base: '48%', sm: 180 }}
        />
        <Select
          aria-label={t('sort')}
          data={[{ value: 'name', label: t('sort_name') }, { value: 'left', label: t('sort_left') }]}
          defaultValue="name"
          allowDeselect={false}
          w={{ base: '48%', sm: 200 }}
        />
        <Box style={{ flex: 1 }} />
        <Box visibleFrom="sm"><PoolLegend /></Box>
      </Group>

      {state === 'no_results' ? (
        <Paper withBorder p="lg">
          <Group justify="space-between">
            <Text>{t('no_results', { query })}</Text>
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={() => setState('list')}>{t('clear_search')}</Button>
          </Group>
        </Paper>
      ) : (
        <>
          <EmployeesTable rows={rows} {...actions} />
          <EmployeeCards rows={rows} {...actions} />
          {state === 'empty' && <EmptyState onAdd={() => setForm({ employee: null })} />}
        </>
      )}

      {form && (
        <EmployeeModal
          key={`${form.employee?.id ?? 'new'}-${state}`}
          opened
          employee={form.employee}
          loginTaken={state === 'login_taken' && form.employee === null}
          onClose={() => setForm(null)}
        />
      )}
      <PasswordModal employee={password} onClose={() => setPassword(null)} />
      <ArchiveModal employee={archive} onClose={() => setArchive(null)} />
      <CloseYearModal opened={closeYear} onClose={() => setCloseYear(false)} />
    </Stack>
  );
};
