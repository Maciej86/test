import { Anchor, Badge, Group, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DateText } from '../../common/DateText';
import { InfoCard } from '../../common/InfoCard';
import { useMockupRole } from '../../common/mockupRole';
import { MY_POOL, MY_TASKS, PENDING_REQUESTS, TASK_COUNTS } from './data';

function AdminDashboard() {
  const { t } = useTranslation('dashboard');
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <InfoCard
        title={t('pending_title', { count: PENDING_REQUESTS.length })}
        actions={<Anchor size="sm" component={Link} to="/admin/leave-requests">{t('pending_all')}</Anchor>}
      >
        {PENDING_REQUESTS.map((r) => (
          <Group key={r.id} justify="space-between" wrap="nowrap">
            <div>
              <Text fw={500}>{r.employee}</Text>
              <Text size="sm" c="dimmed">
                {r.type}, <DateText value={r.from} /> – <DateText value={r.to} />
              </Text>
            </div>
            <Badge variant="light">{t('days', { count: r.days })}</Badge>
          </Group>
        ))}
      </InfoCard>
      <InfoCard title={t('tasks_title')} actions={<Anchor size="sm" component={Link} to="/admin/tasks">{t('tasks_open')}</Anchor>}>
        <Group justify="space-between"><Text>{t('col_draft')}</Text><Text fw={600}>{TASK_COUNTS.draft}</Text></Group>
        <Group justify="space-between"><Text>{t('col_in_progress')}</Text><Text fw={600}>{TASK_COUNTS.inProgress}</Text></Group>
        <Group justify="space-between"><Text>{t('col_done')}</Text><Text fw={600}>{TASK_COUNTS.done}</Text></Group>
        <Group justify="space-between"><Text c="red.7">{t('overdue')}</Text><Text fw={600} c="red.7">{TASK_COUNTS.overdue}</Text></Group>
      </InfoCard>
    </SimpleGrid>
  );
}

function EmployeeDashboard() {
  const { t } = useTranslation('dashboard');
  const total = MY_POOL.annual + MY_POOL.carriedOver;
  const left = total - MY_POOL.used;
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <InfoCard title={t('pool_title', { year: MY_POOL.year })} actions={<Anchor size="sm" component={Link} to="/admin/my-leave">{t('pool_request')}</Anchor>}>
        <Group align="baseline" gap="xs">
          <Text fz={40} fw={700} lh={1}>{left}</Text>
          <Text c="dimmed">{t('pool_left', { total })}</Text>
        </Group>
        <Progress value={(MY_POOL.used / total) * 100} />
        <Text size="sm" c="dimmed">
          {t('pool_details', { annual: MY_POOL.annual, carried: MY_POOL.carriedOver, used: MY_POOL.used })}
        </Text>
      </InfoCard>
      <InfoCard title={t('my_tasks_title')} actions={<Anchor size="sm" component={Link} to="/admin/tasks">{t('tasks_open')}</Anchor>}>
        {MY_TASKS.map((task) => (
          <Group key={task.id} justify="space-between" wrap="nowrap">
            <div>
              <Text fw={500}>{task.title}</Text>
              <Text size="sm" c="dimmed">{task.column}</Text>
            </div>
            {task.due && <Text size="sm"><DateText value={task.due} /></Text>}
          </Group>
        ))}
      </InfoCard>
    </SimpleGrid>
  );
}

export function DashboardMockup() {
  const { t } = useTranslation('dashboard');
  const role = useMockupRole();
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      {role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />}
    </Stack>
  );
}
