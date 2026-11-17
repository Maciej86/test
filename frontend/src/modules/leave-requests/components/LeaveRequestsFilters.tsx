import { Group, SegmentedControl, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { LEAVE_REQUEST_FILTERS, currentYear, type LeaveRequestFilter, type LeaveRequestsListQuery, type LeaveRequestsListResponse } from '@app/shared';
import { SearchField } from '../../../common/SearchField';

const ALL_TYPES = 'all';
/** Kolejność zakładek: najpierw to, co czeka na decyzję (7a), potem pozostałe statusy i wszystkie. */
const TABS: LeaveRequestFilter[] = ['pending', 'approved', 'rejected', 'cancelled', 'withdrawn', 'all'];

type Filters = Pick<LeaveRequestsListQuery, 'status' | 'year' | 'leaveTypeId' | 'search'>;

/**
 * Zakładki statusów (na telefonie lista rozwijana), wyszukiwarka, rok (poza „Czekają”) i typ urlopu. Stan siedzi
 * w adresie; zmiana wraca do strony 1.
 */
export const LeaveRequestsFilters = ({ value, data, onChange }: {
  value: Filters;
  data: Pick<LeaveRequestsListResponse, 'pendingCount' | 'years' | 'leaveTypes'> | undefined;
  onChange: (next: Partial<Filters>) => void;
}) => {
  const { t } = useTranslation('leave-requests');
  const tabs = TABS.filter((s) => LEAVE_REQUEST_FILTERS.includes(s)).map((s) => ({
    value: s,
    label: s === 'pending' ? t('filter_pending', { count: data?.pendingCount ?? 0 }) : t(`filter.${s}`),
  }));
  const setStatus = (status: string | null) => status && onChange({ status: status as LeaveRequestFilter });
  const years = (data?.years ?? [currentYear()]).map(String);

  return (
    <>
      <SegmentedControl visibleFrom="sm" value={value.status} onChange={setStatus} data={tabs} style={{ alignSelf: 'flex-start' }} />
      <Select hiddenFrom="sm" aria-label={t('col_status')} value={value.status} onChange={setStatus} data={tabs} allowDeselect={false} />
      <Group gap="sm" align="flex-end">
        <SearchField label={t('search')} value={value.search} onChange={(search) => onChange({ search })} w={{ base: '100%', sm: 260 }} />
        {value.status !== 'pending' && (
          <Select
            aria-label={t('year')}
            data={years}
            value={String(value.year ?? currentYear())}
            onChange={(v) => v && onChange({ year: Number(v) })}
            allowDeselect={false}
            w={{ base: '48%', xs: 120 }}
          />
        )}
        <Select
          aria-label={t('type')}
          data={[{ value: ALL_TYPES, label: t('type_all') }, ...(data?.leaveTypes ?? []).map((lt) => ({ value: String(lt.id), label: lt.name }))]}
          value={value.leaveTypeId === undefined ? ALL_TYPES : String(value.leaveTypeId)}
          onChange={(v) => onChange({ leaveTypeId: !v || v === ALL_TYPES ? undefined : Number(v) })}
          allowDeselect={false}
          w={{ base: '48%', xs: 220 }}
        />
      </Group>
    </>
  );
};
