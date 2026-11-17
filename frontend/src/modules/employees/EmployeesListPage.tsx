import { useState } from 'react';
import { Button, Paper, Stack, Tooltip } from '@mantine/core';
import { Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { currentYear, employeesListQuerySchema, type EmployeeListItem } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { ListPagination } from '../../common/ListPagination';
import { PageHeader } from '../../common/PageHeader';
import { useListParams } from '../../core/useListParams';
import { ArchiveModal } from './components/ArchiveModal';
import { CloseYearModal } from './components/CloseYearModal';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import { PasswordModal } from './components/PasswordModal';
import { EmployeesFilters } from './components/EmployeesFilters';
import { EmployeeCards, EmployeesTable } from './components/EmployeesTable';
import { useEmployees } from './employees.api';

/** Otwarte okno na ekranie listy. */
export type EmployeeDialog =
  | { kind: 'form'; employee: EmployeeListItem | null }
  | { kind: 'password' | 'archive'; employee: EmployeeListItem }
  | { kind: 'close-year' };

const LIST_DEFAULTS = { page: 1, search: '', sort: 'name', dir: 'asc' } as const;

export const EmployeesListPage = () => {
  const { t } = useTranslation('employees');
  const [params, setParams] = useListParams(employeesListQuerySchema, LIST_DEFAULTS);
  const employees = useEmployees(params);
  const [dialog, setDialog] = useState<EmployeeDialog | null>(null);
  const close = () => setDialog(null);
  const data = employees.data;
  const year = data?.openYear ?? currentYear();
  const canCloseYear = year <= currentYear();
  const filtered = params.search !== '' || params.role !== undefined;
  const onlyAdmins = data !== undefined && data.counts.all === data.counts.admins;
  const actions = {
    onEdit: (employee: EmployeeListItem) => setDialog({ kind: 'form', employee }),
    onPassword: (employee: EmployeeListItem) => setDialog({ kind: 'password', employee }),
    onArchive: (employee: EmployeeListItem) => setDialog({ kind: 'archive', employee }),
  };
  const add = () => setDialog({ kind: 'form', employee: null });
  const addButton = <Button leftSection={<ButtonIcon action="add" />} onClick={add}>{t('add')}</Button>;

  return (
    <Stack>
      <PageHeader
        title={t('title')}
        subtitle={data && t('summary', { count: data.counts.all, admins: data.counts.admins })}
        actions={
          <>
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
            {addButton}
          </>
        }
      />

      <EmployeesFilters value={params} onChange={setParams} />

      <DataState query={employees}>
        {data && data.items.length === 0 && filtered ? (
          <Paper withBorder>
            <EmptyState
              icon={Search}
              text={t('no_results', { query: params.search })}
              action={
                <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={() => setParams({ search: '', role: undefined })}>
                  {t('clear_search')}
                </Button>
              }
            />
          </Paper>
        ) : (
          data && (
            <>
              <EmployeesTable rows={data.items} year={year} {...actions} />
              <EmployeeCards rows={data.items} {...actions} />
              {onlyAdmins && !filtered && (
                <Paper withBorder>
                  <EmptyState icon={Users} title={t('empty_title')} text={t('empty_text')} action={addButton} />
                </Paper>
              )}
              <ListPagination data={data} page={params.page} onChange={(page) => setParams({ page })} />
            </>
          )
        )}
      </DataState>

      {dialog?.kind === 'form' && (
        <EmployeeFormModal key={dialog.employee?.id ?? 'new'} opened employee={dialog.employee} year={year} onClose={close} />
      )}
      {dialog?.kind === 'password' && <PasswordModal employee={dialog.employee} onClose={close} />}
      {dialog?.kind === 'archive' && <ArchiveModal employee={dialog.employee} onClose={close} />}
      {dialog?.kind === 'close-year' && <CloseYearModal opened onClose={close} />}
    </Stack>
  );
};
