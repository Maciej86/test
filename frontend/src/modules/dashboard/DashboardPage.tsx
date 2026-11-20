import { Grid, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, formatDate, type AdminDashboard as AdminData, type EmployeeDashboard as EmployeeData } from '@app/shared';
import { DataState } from '../../common/DataState';
import { PageHeader } from '../../common/PageHeader';
import { useDashboard } from './dashboard.api';
import { AbsenceBox } from './components/AbsenceBox';
import { MyTasksBox } from './components/MyTasksBox';
import { PendingBox } from './components/PendingBox';
import { ProjectsBox } from './components/ProjectsBox';

const AdminDashboard = ({ data }: { data: AdminData }) => (
  <Grid gap="md">
    <Grid.Col span={{ base: 12, lg: 5 }}><PendingBox pending={data.pending} today={data.today} /></Grid.Col>
    <Grid.Col span={{ base: 12, lg: 7 }}><AbsenceBox absences={data.absences} today={data.today} /></Grid.Col>
    <Grid.Col span={{ base: 12, lg: 7 }}><ProjectsBox projects={data.projects} overdue={data.overdue} today={data.today} /></Grid.Col>
    <Grid.Col span={{ base: 12, lg: 5 }}><MyTasksBox tasks={data.myTasks} today={data.today} /></Grid.Col>
  </Grid>
);

const EmployeeDashboard = ({ data }: { data: EmployeeData }) => (
  <Grid gap="md">
    <Grid.Col span={12}><MyTasksBox tasks={data.myTasks} today={data.today} /></Grid.Col>
  </Grid>
);

/** Pulpit: po zalogowaniu co jest do zrobienia; treść zależna od roli (liczy serwer). */
export const DashboardPage = () => {
  const { t } = useTranslation('dashboard');
  const dashboard = useDashboard();
  const data = dashboard.data;
  const today = data ? `${dayjs(data.today).locale('pl').format('dddd')}, ${formatDate(data.today)}` : '';

  return (
    <Stack>
      <PageHeader title={t('title')} subtitle={data && t('today', { date: today })} />
      <DataState query={dashboard}>
        {data && (data.role === 'admin' ? <AdminDashboard data={data} /> : <EmployeeDashboard data={data} />)}
      </DataState>
    </Stack>
  );
};
