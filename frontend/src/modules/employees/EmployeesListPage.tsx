import { useState } from 'react';
import { Button, Group, Pagination, Paper, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { employeesListQuerySchema, todayIsoDate, type EmployeeListItem, type EmployeesListQuery } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { EmployeesFilters } from './components/EmployeesFilters';
import { EmployeeCards, EmployeesTable } from './components/EmployeesTable';
import { useEmployees } from './employees.api';

/** Otwarte okno na ekranie listy. */
export type EmployeeDialog =
  | { kind: 'form'; employee: EmployeeListItem | null }
  | { kind: 'password' | 'archive'; employee: EmployeeListItem }
  | { kind: 'close-year' };

/** Adres → parametry listy (ten sam schemat sprawdza je na serwerze). */
function useListParams(): [EmployeesListQuery, (next: Partial<EmployeesListQuery>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = employeesListQuerySchema.parse(Object.fromEntries(searchParams)) as EmployeesListQuery;
  const update = (next: Partial<EmployeesListQuery>) => {
    const merged = { ...params, page: 1, ...next };
    const entries = Object.entries(merged).filter(([k, v]) => v !== undefined && v !== '' && !(k === 'page' && v === 1));
    setSearchParams(new URLSearchParams(entries.map(([k, v]) => [k, String(v)])));
  };
  return [params, update];
}

function NoEmployeesYet({ onAdd }: { onAdd: () => void }) {
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
}

export function EmployeesListPage() {
  const { t } = useTranslation('employees');
  const [params, setParams] = useListParams();
  const employees = useEmployees(params);
  const [, setDialog] = useState<EmployeeDialog | null>(null);
  const data = employees.data;
  const year = data?.openYear ?? Number(todayIsoDate().slice(0, 4));
  const canCloseYear = year <= Number(todayIsoDate().slice(0, 4));
  const filtered = params.search !== '' || params.role !== undefined;
  const onlyAdmins = data !== undefined && data.counts.all === data.counts.admins;
  const actions = {
    onEdit: (employee: EmployeeListItem) => setDialog({ kind: 'form', employee }),
    onPassword: (employee: EmployeeListItem) => setDialog({ kind: 'password', employee }),
    onArchive: (employee: EmployeeListItem) => setDialog({ kind: 'archive', employee }),
  };
  const add = () => setDialog({ kind: 'form', employee: null });

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Title order={1}>{t('title')}</Title>
          {data && <Text c="dimmed" size="sm">{t('summary', { count: data.counts.all, admins: data.counts.admins })}</Text>}
        </Stack>
        <Group gap="xs">
          <Tooltip label={t('close_year_later', { year })} disabled={canCloseYear}>
            <Button
              variant="default"
              leftSection={<ButtonIcon action="close_year" />}
              disabled={!canCloseYear || onlyAdmins}
              onClick={() => setDialog({ kind: 'close-year' })}
            >
              {t('close_year', { year })}
            </Button>
          </Tooltip>
          <Button leftSection={<ButtonIcon action="add" />} onClick={add}>{t('add')}</Button>
        </Group>
      </Group>

      <EmployeesFilters value={params} onChange={setParams} />

      <DataState query={employees}>
        {data && data.items.length === 0 && filtered ? (
          <Paper withBorder p="lg">
            <Group justify="space-between">
              <Text>{t('no_results', { query: params.search })}</Text>
              <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={() => setParams({ search: '', role: undefined })}>
                {t('clear_search')}
              </Button>
            </Group>
          </Paper>
        ) : (
          data && (
            <>
              <EmployeesTable rows={data.items} year={year} {...actions} />
              <EmployeeCards rows={data.items} {...actions} />
              {onlyAdmins && !filtered && <NoEmployeesYet onAdd={add} />}
              {data.total > data.pageSize && (
                <Pagination
                  total={Math.ceil(data.total / data.pageSize)}
                  value={params.page}
                  onChange={(page) => setParams({ page })}
                />
              )}
            </>
          )
        )}
      </DataState>
    </Stack>
  );
}
