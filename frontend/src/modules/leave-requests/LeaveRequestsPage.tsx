import { useState } from 'react';
import { Paper, Stack } from '@mantine/core';
import { CalendarCheck, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { formatDate, leaveRequestsListQuerySchema, type LeaveRequestListItem } from '@app/shared';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { ListPagination } from '../../common/ListPagination';
import { PageHeader } from '../../common/PageHeader';
import { useListParams } from '../../core/useListParams';
import { LeaveRequestsFilters } from './components/LeaveRequestsFilters';
import { LeaveRequestCards, LeaveRequestsTable, type RowActions } from './components/LeaveRequestsTable';
import { useLeaveRequests } from './leave-requests.api';

const LIST_PATH = '/admin/leave-requests';
const LIST_DEFAULTS = { page: 1, search: '', sort: 'default', dir: 'asc', status: 'pending' } as const;

/** Otwarte okno decyzji (kroki 12–13: szczegóły i okna). */
export type DecisionDialog = { kind: 'approve' | 'reject' | 'cancel'; request: LeaveRequestListItem };

/**
 * „Wnioski urlopowe” (administrator): lista z zakładkami i filtrami w adresie. Adres `/admin/leave-requests/:id`
 * (link z e-maila i z dzwonka) pokazuje tę samą listę z otwartymi szczegółami wniosku.
 */
export const LeaveRequestsPage = () => {
  const { t } = useTranslation('leave-requests');
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useListParams(leaveRequestsListQuerySchema, LIST_DEFAULTS);
  const requests = useLeaveRequests(params);
  const [, setDialog] = useState<DecisionDialog | null>(null);
  const data = requests.data;
  const filtered = params.status !== 'pending' || params.search !== '' || params.leaveTypeId !== undefined;

  const actions: RowActions = {
    onDetails: (r) => navigate(`${LIST_PATH}/${r.id}${location.search}`),
    onApprove: (request) => setDialog({ kind: 'approve', request }),
    onReject: (request) => setDialog({ kind: 'reject', request }),
    onCancel: (request) => setDialog({ kind: 'cancel', request }),
  };

  return (
    <Stack>
      <PageHeader
        title={t('title')}
        subtitle={
          data &&
          (data.pendingCount === 0 ? t('summary_none') : t('summary', { count: data.pendingCount, date: formatDate(data.oldestPendingAt) }))
        }
      />
      <LeaveRequestsFilters value={params} data={data} onChange={setParams} />

      <DataState query={requests}>
        {data && data.items.length === 0 ? (
          <Paper withBorder>
            {filtered ? (
              <EmptyState icon={Search} text={t('no_results')} />
            ) : (
              <EmptyState icon={CalendarCheck} title={t('empty_pending_title')} text={t('empty_pending')} />
            )}
          </Paper>
        ) : (
          data && (
            <>
              <LeaveRequestsTable rows={data.items} {...actions} />
              <LeaveRequestCards rows={data.items} {...actions} />
              <ListPagination data={data} page={params.page} onChange={(page) => setParams({ page })} />
            </>
          )
        )}
      </DataState>
    </Stack>
  );
};
