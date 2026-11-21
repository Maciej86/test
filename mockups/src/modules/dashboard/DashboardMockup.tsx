import { useState, type ReactNode } from 'react';
import { Anchor, Badge, Box, Button, Divider, Grid, Group, Paper, SegmentedControl, Stack, Table, Text, UnstyledButton } from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CALENDAR_PATH, dayjs, formatDate } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { InfoCard } from '../../common/InfoCard';
import { LeaveDates, LeaveStatusBadge } from '../../common/LeaveRequestParts';
import { PageHeader } from '../../common/PageHeader';
import { PersonAvatar } from '../../common/PersonAvatar';
import { PoolCard } from '../../common/PoolCard';
import { useMockupRole } from '../../common/mockupRole';
import { AbsenceStrip } from './AbsenceStrip';
import {
  BOX_LIMIT, MY_NEXT_LEAVE, MY_PENDING, MY_POOL, MY_TASKS, OVERDUE_TASKS, PENDING_REQUESTS, PROJECT_COUNTS, TODAY,
  type DashboardTask,
} from './data';

const STATES = ['normal', 'empty'] as const;
type State = (typeof STATES)[number];

/** Ile dni zostało do dnia (0 = dziś). */
const daysUntil = (iso: string) => dayjs(iso).diff(dayjs(TODAY), 'day');

/** Kolor terminu jak na karcie zadania: po czasie czerwony, dziś i jutro żółty. */
const dueColor = (due: string | null) => {
  if (due === null) return 'dimmed';
  const left = daysUntil(due);
  if (left < 0) return 'red.4';
  if (left <= 1) return 'yellow.4';
  return undefined;
};

/** Wiersz-link: cały wiersz klikalny, delikatne podświetlenie po najechaniu. */
const RowLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <UnstyledButton component={Link} to={to} px="xs" py={6} mx="-xs" style={{ borderRadius: 3 }}>
    {children}
  </UnstyledButton>
);

const PendingBox = ({ empty }: { empty: boolean }) => {
  const { t } = useTranslation('dashboard');
  const rows = empty ? [] : PENDING_REQUESTS;
  return (
    <InfoCard
      title={
        <Group gap="xs">
          {t('pending.title')}
          {rows.length > 0 && <Badge variant="light" color="yellow" size="lg">{rows.length}</Badge>}
        </Group>
      }
      actions={<Anchor size="sm" component={Link} to="/admin/leave-requests">{t('pending.all')}</Anchor>}
    >
      {rows.length === 0 && <Text c="dimmed">{t('pending.empty')}</Text>}
      {rows.slice(0, BOX_LIMIT).map((r) => {
        const startsIn = daysUntil(r.from);
        return (
          <RowLink key={r.id} to={`/admin/leave-requests/${r.id}`}>
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Box miw={0}>
                <Text fw={600} truncate>{r.employee}</Text>
                <Text size="sm">
                  {r.type}, <LeaveDates from={r.from} to={r.to} />
                </Text>
                <Text size="xs" c="dimmed">
                  {t('pending.submitted', { date: formatDate(r.createdAt) })},{' '}
                  <Text span inherit c={startsIn <= 7 ? 'yellow.4' : undefined} fw={startsIn <= 7 ? 600 : undefined}>
                    {t('pending.starts_in', { count: startsIn })}
                  </Text>
                </Text>
              </Box>
              <Badge variant="light" color="gray" style={{ flex: 'none' }}>{t('days', { count: r.days })}</Badge>
            </Group>
          </RowLink>
        );
      })}
    </InfoCard>
  );
};

/** Zadanie w boksie: tytuł, projekt i kolumna, termin po prawej; przy zadaniach po terminie także osoby. */
const TaskRow = ({ task, withPeople = false }: { task: DashboardTask; withPeople?: boolean }) => {
  const { t } = useTranslation('dashboard');
  const left = task.due === null ? null : daysUntil(task.due);
  return (
    <RowLink to={`/admin/tasks/${task.projectId}?task=${task.id}`}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box miw={0}>
          <Text fw={500} lineClamp={2}>{task.title}</Text>
          <Group gap={6} mt={2}>
            <Badge variant="outline" color="gray" size="sm">{task.project}</Badge>
            <Text size="xs" c="dimmed">{t(`column.${task.column}`)}</Text>
          </Group>
        </Box>
        <Stack gap={4} align="flex-end" style={{ flex: 'none' }}>
          <Text size="sm" c={dueColor(task.due)} fw={left !== null && left <= 1 ? 600 : undefined}>
            {left === null ? t('my_tasks.no_due') : left === 0 ? t('my_tasks.due_today') : left === 1 ? t('my_tasks.due_tomorrow') : <DateText value={task.due} />}
          </Text>
          {withPeople && (
            <Group gap={4} wrap="nowrap">
              {task.assignees.map((p) => <PersonAvatar key={p} name={p} tooltip={p} />)}
            </Group>
          )}
        </Stack>
      </Group>
    </RowLink>
  );
};

const MyTasksBox = ({ tasks }: { tasks: DashboardTask[] }) => {
  const { t } = useTranslation('dashboard');
  const hidden = tasks.length - BOX_LIMIT;
  return (
    <InfoCard title={t('my_tasks.title')}>
      {tasks.length === 0 && <Text c="dimmed">{t('my_tasks.empty')}</Text>}
      {tasks.slice(0, BOX_LIMIT).map((task) => <TaskRow key={task.id} task={task} />)}
      {hidden > 0 && <Text size="sm" c="dimmed">{t('more', { count: hidden })}</Text>}
    </InfoCard>
  );
};

const ProjectsBox = ({ empty }: { empty: boolean }) => {
  const { t } = useTranslation('dashboard');
  const projects = empty ? [] : PROJECT_COUNTS;
  const overdue = empty ? [] : OVERDUE_TASKS;
  return (
    <InfoCard title={t('projects.title')} actions={<Anchor size="sm" component={Link} to="/admin/tasks/projects">{t('projects.add')}</Anchor>}>
      {projects.length === 0 ? (
        <Text c="dimmed">{t('projects.empty')}</Text>
      ) : (
        <Table.ScrollContainer minWidth={480}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('projects.project')}</Table.Th>
                <Table.Th ta="right">{t('projects.draft')}</Table.Th>
                <Table.Th ta="right">{t('projects.in_progress')}</Table.Th>
                <Table.Th ta="right">{t('projects.overdue')}</Table.Th>
                <Table.Th ta="right">{t('projects.done_recently')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {projects.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td><Anchor component={Link} to={`/admin/tasks/${p.id}`} fw={600}>{p.name}</Anchor></Table.Td>
                  <Table.Td ta="right">{p.draft}</Table.Td>
                  <Table.Td ta="right">{p.inProgress}</Table.Td>
                  <Table.Td ta="right" c={p.overdue > 0 ? 'red.4' : 'dimmed'} fw={p.overdue > 0 ? 700 : undefined}>{p.overdue}</Table.Td>
                  <Table.Td ta="right" c="dimmed">{p.doneRecently}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {projects.length > 0 && (
        <>
          <Divider my={4} />
          <Text fw={600} size="sm">{t('overdue.title')}</Text>
          {overdue.length === 0 && <Text size="sm" c="dimmed">{t('overdue.empty')}</Text>}
          {overdue.slice(0, BOX_LIMIT).map((task) => <TaskRow key={task.id} task={task} withPeople />)}
        </>
      )}
    </InfoCard>
  );
};

const AdminDashboard = ({ empty }: { empty: boolean }) => {
  const { t } = useTranslation('dashboard');
  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, lg: 5 }}>
        <PendingBox empty={empty} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 7 }}>
        <InfoCard
          title={t('absence.title')}
          actions={<Button component={Link} to={CALENDAR_PATH} variant="default" leftSection={<ButtonIcon action="calendar" />}>{t('absence.open_calendar')}</Button>}
        >
          <AbsenceStrip absences={empty ? [] : undefined} />
        </InfoCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 7 }}>
        <ProjectsBox empty={empty} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 5 }}>
        <MyTasksBox tasks={empty ? [] : MY_TASKS.admin} />
      </Grid.Col>
    </Grid>
  );
};

/** Ta sama karta co „Urlop w …” na ekranie Moje urlopy (wspólny `PoolCard`), plus przycisk wniosku. */
const PoolBox = () => {
  const { t } = useTranslation('dashboard');
  return (
    <PoolCard
      pool={MY_POOL}
      actions={<Button component={Link} to="/admin/my-leave" leftSection={<ButtonIcon action="add" />}>{t('pool.request')}</Button>}
    />
  );
};

const MyRequestsBox = ({ empty }: { empty: boolean }) => {
  const { t } = useTranslation('dashboard');
  const pending = empty ? [] : MY_PENDING;
  const next = empty ? null : MY_NEXT_LEAVE;
  return (
    <InfoCard title={t('my_requests.title')} actions={<Anchor size="sm" component={Link} to="/admin/my-leave">{t('my_requests.all')}</Anchor>}>
      <Text size="sm" c="dimmed">{t('my_requests.pending_title')}</Text>
      {pending.length === 0 && <Text>{t('my_requests.no_pending')}</Text>}
      {pending.map((r) => (
        <Group key={r.id} justify="space-between" wrap="nowrap">
          <Text>
            {r.type}, <LeaveDates from={r.from} to={r.to} />
          </Text>
          <LeaveStatusBadge status="pending" />
        </Group>
      ))}
      <Divider my={4} />
      <Text size="sm" c="dimmed">{t('my_requests.next_title')}</Text>
      {next === null ? (
        <Text>{t('my_requests.no_next')}</Text>
      ) : (
        <Group justify="space-between" wrap="nowrap">
          <Text>
            {next.type}, <LeaveDates from={next.from} to={next.to} />
          </Text>
          <Badge variant="light" color="green" style={{ flex: 'none' }}>{t('days', { count: next.days })}</Badge>
        </Group>
      )}
    </InfoCard>
  );
};

const EmployeeDashboard = ({ empty }: { empty: boolean }) => (
  <Grid gap="md">
    <Grid.Col span={{ base: 12, lg: 7 }}>
      <PoolBox />
    </Grid.Col>
    <Grid.Col span={{ base: 12, lg: 5 }}>
      <MyRequestsBox empty={empty} />
    </Grid.Col>
    <Grid.Col span={12}>
      <MyTasksBox tasks={empty ? [] : MY_TASKS.employee} />
    </Grid.Col>
  </Grid>
);

export const DashboardMockup = () => {
  const { t } = useTranslation('dashboard');
  const role = useMockupRole();
  const [state, setState] = useState<State>('normal');
  const empty = state === 'empty';
  const today = `${dayjs(TODAY).locale('pl').format('dddd')}, ${formatDate(TODAY)}`;

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

      <PageHeader title={t('title')} subtitle={t('today', { date: today })} />
      {role === 'admin' ? <AdminDashboard empty={empty} /> : <EmployeeDashboard empty={empty} />}
    </Stack>
  );
};
