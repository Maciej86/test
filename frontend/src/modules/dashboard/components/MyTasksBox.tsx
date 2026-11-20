import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { DashboardList, DashboardTask } from '@app/shared';
import { InfoCard } from '../../../common/InfoCard';
import { TaskRow } from './TaskRow';

/** Moje niezrealizowane zadania ze wszystkich moich projektów (obie role); pod listą „i jeszcze N zadań”. */
export const MyTasksBox = ({ tasks, today }: { tasks: DashboardList<DashboardTask>; today: string }) => {
  const { t } = useTranslation('dashboard');
  const hidden = tasks.total - tasks.items.length;
  return (
    <InfoCard title={t('my_tasks.title')}>
      {tasks.items.length === 0 && <Text c="dimmed">{t('my_tasks.empty')}</Text>}
      {tasks.items.map((task) => <TaskRow key={task.id} task={task} today={today} />)}
      {hidden > 0 && <Text size="sm" c="dimmed">{t('more', { count: hidden })}</Text>}
    </InfoCard>
  );
};
