import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { ListTodo, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { SearchField } from '../../common/SearchField';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { EmptyState } from '../../common/EmptyState';
import { PageHeader } from '../../common/PageHeader';
import { RoleBadge } from '../../common/RoleBadge';
import { DeleteEmployeeModal, DeleteTaskModal, RestoreEmployeeModal, RestoreTaskModal, TaskPreview } from './ArchiveModals';
import { ARCHIVED_EMPLOYEES, ARCHIVED_TASKS, PROJECTS, type ArchivedEmployee, type ArchivedTask } from './data';

const STATES = ['list', 'empty', 'no_results'] as const;
type State = (typeof STATES)[number];

/** Kiedy trafiło do archiwum i kto to zrobił. */
const ArchivedCell = ({ at, by }: { at: string; by: string }) => {
  const { t } = useTranslation('archive');
  return (
    <Stack gap={0}>
      <Text size="sm"><DateText value={at} /></Text>
      <Text size="xs" c="dimmed">{t('archived_by', { name: by })}</Text>
    </Stack>
  );
};

const Frame = ({ children }: { children: ReactNode }) => <Paper withBorder p="xl">{children}</Paper>;

/* ---------- Pracownicy ---------- */

interface EmployeeActions {
  onRestore: (e: ArchivedEmployee) => void;
  onDelete: (e: ArchivedEmployee) => void;
}

const EmployeeButtons = ({ e, onRestore, onDelete }: EmployeeActions & { e: ArchivedEmployee }) => {
  const { t } = useTranslation('archive');
  const blocked = e.leaveRequests > 0;
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="restore" size={14} />} onClick={() => onRestore(e)}>{t('restore')}</Button>
      <Tooltip label={t('cannot_delete_with_leave')} disabled={!blocked} multiline w={260}>
        <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="delete" size={14} />} disabled={blocked} onClick={() => onDelete(e)}>
          {t('delete_forever')}
        </Button>
      </Tooltip>
    </Group>
  );
};

const EmployeeName = ({ e }: { e: ArchivedEmployee }) => (
  <Stack gap={0}>
    <Text fw={600}>{e.name}</Text>
    <Text size="sm" c="dimmed">{e.login}</Text>
  </Stack>
);

const EmployeeHistory = ({ e }: { e: ArchivedEmployee }) => {
  const { t } = useTranslation('archive');
  return (
    <Stack gap={0}>
      <Text size="sm" c={e.leaveRequests === 0 ? 'dimmed' : undefined}>{t('leave_requests', { count: e.leaveRequests })}</Text>
      {e.tasks > 0 && <Text size="sm" c="dimmed">{t('tasks', { count: e.tasks })}</Text>}
    </Stack>
  );
};

const EmployeesList = ({ rows, ...actions }: EmployeeActions & { rows: ArchivedEmployee[] }) => {
  const { t } = useTranslation('archive');
  return (
    <>
      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH + 100} visibleFrom="sm">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_name')}</Table.Th>
              <Table.Th>{t('col_role')}</Table.Th>
              <Table.Th>{t('col_history')}</Table.Th>
              <Table.Th>{t('col_archived')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((e) => (
              <Table.Tr key={e.id}>
                <Table.Td><EmployeeName e={e} /></Table.Td>
                <Table.Td><RoleBadge role={e.role} /></Table.Td>
                <Table.Td><EmployeeHistory e={e} /></Table.Td>
                <Table.Td><ArchivedCell at={e.archivedAt} by={e.archivedBy} /></Table.Td>
                <Table.Td><EmployeeButtons e={e} {...actions} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Stack gap="sm" hiddenFrom="sm">
        {rows.map((e) => (
          <Card key={e.id} withBorder padding="md">
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <EmployeeName e={e} />
                <RoleBadge role={e.role} />
              </Group>
              <Group justify="space-between" align="flex-start">
                <EmployeeHistory e={e} />
                <ArchivedCell at={e.archivedAt} by={e.archivedBy} />
              </Group>
              <EmployeeButtons e={e} {...actions} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </>
  );
};

/* ---------- Zadania ---------- */

interface TaskActions {
  onOpen: (task: ArchivedTask) => void;
  onRestore: (task: ArchivedTask) => void;
  onDelete: (task: ArchivedTask) => void;
}

const TaskButtons = ({ task, onRestore, onDelete }: Omit<TaskActions, 'onOpen'> & { task: ArchivedTask }) => {
  const { t } = useTranslation('archive');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap" onClick={(ev) => ev.stopPropagation()}>
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="restore" size={14} />} onClick={() => onRestore(task)}>{t('restore')}</Button>
      <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="delete" size={14} />} onClick={() => onDelete(task)}>{t('delete_forever')}</Button>
    </Group>
  );
};

const TaskTitle = ({ task }: { task: ArchivedTask }) => {
  const { t } = useTranslation('archive');
  return (
    <Stack gap={0}>
      <Text fw={600}>{task.title}</Text>
      {task.comments.length > 0 && <Text size="xs" c="dimmed">{t('comments', { count: task.comments.length })}</Text>}
    </Stack>
  );
};

const TaskWhere = ({ task }: { task: ArchivedTask }) => {
  const { t } = useTranslation('tasks');
  return (
    <Stack gap={0}>
      <Text size="sm">{task.project}</Text>
      <Text size="xs" c="dimmed">{t(`column.${task.column}`)}</Text>
    </Stack>
  );
};

const TasksList = ({ rows, onOpen, ...actions }: TaskActions & { rows: ArchivedTask[] }) => {
  const { t } = useTranslation('archive');
  return (
    <>
      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH + 100} visibleFrom="sm">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_task')}</Table.Th>
              <Table.Th>{t('col_project')}</Table.Th>
              <Table.Th>{t('due')}</Table.Th>
              <Table.Th>{t('col_archived')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((task) => (
              <Table.Tr key={task.id} onClick={() => onOpen(task)} style={{ cursor: 'pointer' }}>
                <Table.Td><TaskTitle task={task} /></Table.Td>
                <Table.Td><TaskWhere task={task} /></Table.Td>
                <Table.Td><Text size="sm"><DateText value={task.dueOn} /></Text></Table.Td>
                <Table.Td><ArchivedCell at={task.archivedAt} by={task.archivedBy} /></Table.Td>
                <Table.Td><TaskButtons task={task} {...actions} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Stack gap="sm" hiddenFrom="sm">
        {rows.map((task) => (
          <Card key={task.id} withBorder padding="md" onClick={() => onOpen(task)} style={{ cursor: 'pointer' }}>
            <Stack gap="sm">
              <TaskTitle task={task} />
              <Group justify="space-between" align="flex-start">
                <TaskWhere task={task} />
                <ArchivedCell at={task.archivedAt} by={task.archivedBy} />
              </Group>
              <TaskButtons task={task} {...actions} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </>
  );
};

/* ---------- Ekran ---------- */

export const ArchiveMockup = () => {
  const { t } = useTranslation('archive');
  const [state, setState] = useState<State>('list');
  const [tab, setTab] = useState<string | null>('employees');
  const [restoreEmployee, setRestoreEmployee] = useState<ArchivedEmployee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<ArchivedEmployee | null>(null);
  const [preview, setPreview] = useState<ArchivedTask | null>(null);
  const [restoreTask, setRestoreTask] = useState<ArchivedTask | null>(null);
  const [deleteTask, setDeleteTask] = useState<ArchivedTask | null>(null);

  const employees = state === 'list' ? ARCHIVED_EMPLOYEES : [];
  const tasks = state === 'list' ? ARCHIVED_TASKS : [];
  const query = state === 'no_results' ? t('mockup_no_results_query') : '';
  const counts = state === 'empty' ? { e: 0, t: 0 } : { e: ARCHIVED_EMPLOYEES.length, t: ARCHIVED_TASKS.length };

  const fromPreview = (open: (task: ArchivedTask) => void) => (task: ArchivedTask) => { setPreview(null); open(task); };

  return (
    <Stack>
      <Paper p="xs" bg="yellow.4" c="dark.9">
        <Group gap="sm">
          <Text size="sm" fw={600}>{t('mockup_state')}</Text>
          <SegmentedControl
            size="xs"
            value={state}
            onChange={(v) => setState(v as State)}
            data={STATES.map((s) => ({ value: s, label: t(`mockup_states.${s}`) }))}
          />
        </Group>
      </Paper>

      <PageHeader title={t('title')} subtitle={t('summary')} />

      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="employees" leftSection={<Users size={16} aria-hidden />}>{t('tab_employees', { count: counts.e })}</Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<ListTodo size={16} aria-hidden />}>{t('tab_tasks', { count: counts.t })}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="employees" pt="md">
          <Stack>
            {state !== 'empty' && (
              <SearchField key={state} label={t('search_employees')} value={query} onChange={() => undefined} w={{ base: '100%', sm: 420 }} />
            )}
            {state === 'empty' && <Frame><EmptyState icon={Users} title={t('empty_employees_title')} text={t('empty_employees_text')} /></Frame>}
            {state === 'no_results' && <Frame><EmptyState text={t('no_results')} /></Frame>}
            {state === 'list' && <EmployeesList rows={employees} onRestore={setRestoreEmployee} onDelete={setDeleteEmployee} />}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="tasks" pt="md">
          <Stack>
            {state !== 'empty' && (
              <Group gap="sm" align="flex-end">
                <SearchField key={state} label={t('search_tasks')} value={query} onChange={() => undefined} w={{ base: '100%', sm: 320 }} />
                <Select
                  aria-label={t('project')}
                  placeholder={t('all_projects')}
                  data={PROJECTS}
                  clearable
                  w={{ base: '100%', sm: 240 }}
                />
              </Group>
            )}
            {state === 'empty' && <Frame><EmptyState icon={ListTodo} title={t('empty_tasks_title')} text={t('empty_tasks_text')} /></Frame>}
            {state === 'no_results' && <Frame><EmptyState text={t('no_results')} /></Frame>}
            {state === 'list' && <TasksList rows={tasks} onOpen={setPreview} onRestore={setRestoreTask} onDelete={setDeleteTask} />}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {restoreEmployee && <RestoreEmployeeModal employee={restoreEmployee} onClose={() => setRestoreEmployee(null)} />}
      {deleteEmployee && <DeleteEmployeeModal employee={deleteEmployee} onClose={() => setDeleteEmployee(null)} />}
      {preview && <TaskPreview task={preview} onClose={() => setPreview(null)} onRestore={fromPreview(setRestoreTask)} onDelete={fromPreview(setDeleteTask)} />}
      {restoreTask && <RestoreTaskModal task={restoreTask} onClose={() => setRestoreTask(null)} />}
      {deleteTask && <DeleteTaskModal task={deleteTask} onClose={() => setDeleteTask(null)} />}
    </Stack>
  );
};
