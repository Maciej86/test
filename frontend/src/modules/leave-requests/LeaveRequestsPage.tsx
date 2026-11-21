import { useEffect, useState } from 'react';
import { Paper, Stack } from '@mantine/core';
import { CalendarCheck, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { LEAVE_REQUESTS_PATH, formatDate, leaveRequestsListQuerySchema } from '@app/shared';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { ListPagination } from '../../common/ListPagination';
import { PageHeader } from '../../common/PageHeader';
import { apiErrorKey } from '../../core/api/client';
import { notify } from '../../core/notify';
import { useCurrentSearch } from '../../core/routes/useCurrentSearch';
import { useEmptyLaterPage } from '../../core/useEmptyLaterPage';
import { useListParams } from '../../core/useListParams';
import { LeaveRequestsFilters } from './components/LeaveRequestsFilters';
import { LeaveRequestCards, LeaveRequestsTable, type RowActions } from './components/LeaveRequestsTable';
import { DecisionWindow, type DecisionDialog } from '../../common/leave-request/DecisionModals';
import { DetailsDrawer } from '../../common/leave-request/DetailsDrawer';
import { useLeaveRequest } from '../../core/leaveRequestDecisions';
import { useLeaveRequests } from './leave-requests.api';

const LIST_DEFAULTS = { page: 1, search: '', sort: 'default', dir: 'asc', status: 'pending' } as const;

/**
 * „Wnioski urlopowe” (administrator): lista z zakładkami i filtrami w adresie. Adres `/admin/leave-requests/:id`
 * (link z e-maila i z dzwonka) pokazuje tę samą listę z otwartymi szczegółami wniosku.
 */
export const LeaveRequestsPage = () => {
  const { t } = useTranslation('leave-requests');
  const navigate = useNavigate();
  // Filtry listy czytane w chwili kliknięcia: klik zaraz po wyszukaniu zabiera już nowe wyszukiwanie.
  const currentSearch = useCurrentSearch();
  const [params, setParams] = useListParams(leaveRequestsListQuerySchema, LIST_DEFAULTS);
  const requests = useLeaveRequests(params);
  const [dialog, setDialog] = useState<DecisionDialog | null>(null);
  // Numer wniosku z adresu: tylko same cyfry (jak idParam na serwerze); inny tekst = brak wniosku.
  const { id: rawId } = useParams();
  const id = rawId !== undefined && /^[1-9]\d{0,9}$/.test(rawId) ? Number(rawId) : null;
  const details = useLeaveRequest(id);
  const backToList = () => navigate(`${LEAVE_REQUESTS_PATH}${currentSearch()}`);
  const missing = rawId !== undefined && (id === null || apiErrorKey(details.error) === 'server.not_found');
  useEffect(() => {
    if (!missing) return;
    notify.error(t('not_found'));
    navigate(`${LEAVE_REQUESTS_PATH}${currentSearch()}`, { replace: true });
    // Filtry czytane w chwili przejścia (currentSearch) nie są powodem efektu, więc ich tu nie ma.
  }, [missing, navigate, t]);
  const data = requests.data;
  const filtered = params.status !== 'pending' || params.search !== '' || params.leaveTypeId !== undefined;
  // Ostatni wniosek ze strony 2+ rozpatrzony: pusta strona to nie „Wszystko rozpatrzone”, tylko powrót na stronę 1.
  const emptyLaterPage = useEmptyLaterPage(data, params.page, () => setParams({ page: 1 }));

  const actions: RowActions = {
    onDetails: (r) => navigate(`${LEAVE_REQUESTS_PATH}/${r.id}${currentSearch()}`),
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
        {emptyLaterPage ? null : data && data.items.length === 0 ? (
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

      <DetailsDrawer
        id={missing ? null : id}
        details={details}
        showInCalendar
        onClose={backToList}
        onApprove={actions.onApprove}
        onReject={actions.onReject}
        onCancel={actions.onCancel}
      />
      {dialog && (
        // Po decyzji zamykają się też szczegóły (gdy były otwarte), lista zostaje z tymi samymi filtrami.
        <DecisionWindow key={`${dialog.kind}-${dialog.request.id}`} dialog={dialog} onClose={() => setDialog(null)} onDone={() => rawId !== undefined && backToList()} />
      )}
    </Stack>
  );
};
