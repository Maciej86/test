import { Stack, Tabs } from '@mantine/core';
import { ListTodo, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { archivePageSchema, type ArchiveTab } from '@app/shared';
import { PageHeader } from '../../common/PageHeader';
import { useListParams } from '../../core/useListParams';
import { useArchiveCounts } from './archive.api';
import { ArchivedEmployees } from './components/ArchivedEmployees';
import { ArchivedTasks } from './components/ArchivedTasks';

const DEFAULTS = { tab: 'employees', page: 1, search: '' } as const;

/** Archiwum (tylko administrator): zakładki Pracownicy i Zadania; zakładka, szukanie, projekt i strona w adresie. */
export const ArchivePage = () => {
  const { t } = useTranslation('archive');
  const [params, setParams] = useListParams(archivePageSchema, DEFAULTS);
  const counts = useArchiveCounts().data;
  // Zmiana zakładki zaczyna od czystej listy (bez szukania, projektu, strony i podglądu).
  const changeTab = (tab: string | null) => setParams({ tab: (tab ?? 'employees') as ArchiveTab, search: '', page: 1, projectId: undefined, taskId: undefined });
  return (
    <Stack>
      <PageHeader title={t('title')} subtitle={t('summary')} />
      <Tabs value={params.tab} onChange={changeTab}>
        <Tabs.List>
          <Tabs.Tab value="employees" leftSection={<Users size={16} aria-hidden />}>{t('tab_employees', { count: counts?.employees ?? 0 })}</Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<ListTodo size={16} aria-hidden />}>{t('tab_tasks', { count: counts?.tasks ?? 0 })}</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      {params.tab === 'employees' ? (
        <ArchivedEmployees page={params.page} search={params.search} onChange={setParams} />
      ) : (
        <ArchivedTasks params={params} onChange={setParams} />
      )}
    </Stack>
  );
};
