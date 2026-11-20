import { Anchor, Divider, Table, Text } from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TASK_PROJECTS_PATH, taskBoardPath, type AdminDashboard } from '@app/shared';
import { InfoCard } from '../../../common/InfoCard';
import { TaskRow } from './TaskRow';

/** Szerokość tabeli, poniżej której przewija się w bok (5 wąskich kolumn liczb). */
const TABLE_WIDTH = 480;

/** Stan tablic: liczby zadań w każdym projekcie, a pod spodem zadania po terminie ze wszystkich projektów. */
export const ProjectsBox = ({ projects, overdue, today }: Pick<AdminDashboard, 'projects' | 'overdue' | 'today'>) => {
  const { t } = useTranslation('dashboard');
  return (
    <InfoCard title={t('projects.title')} actions={<Anchor size="sm" component={Link} to={TASK_PROJECTS_PATH}>{t('projects.add')}</Anchor>}>
      {projects.length === 0 ? (
        <Text c="dimmed">{t('projects.empty')}</Text>
      ) : (
        <>
          <Table.ScrollContainer minWidth={TABLE_WIDTH}>
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
                    <Table.Td><Anchor component={Link} to={taskBoardPath(p.id)} fw={600}>{p.name}</Anchor></Table.Td>
                    <Table.Td ta="right">{p.draft}</Table.Td>
                    <Table.Td ta="right">{p.inProgress}</Table.Td>
                    <Table.Td ta="right" c={p.overdue > 0 ? 'red.4' : 'dimmed'} fw={p.overdue > 0 ? 700 : undefined} data-overdue={p.overdue > 0}>
                      {p.overdue}
                    </Table.Td>
                    <Table.Td ta="right" c="dimmed">{p.doneRecently}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Divider my={4} />
          <Text fw={600} size="sm">{t('overdue.title')}</Text>
          {overdue.items.length === 0 && <Text size="sm" c="dimmed">{t('overdue.empty')}</Text>}
          {overdue.items.map((task) => <TaskRow key={task.id} task={task} today={today} withPeople />)}
          {overdue.total > overdue.items.length && <Text size="sm" c="dimmed">{t('more', { count: overdue.total - overdue.items.length })}</Text>}
        </>
      )}
    </InfoCard>
  );
};
