import { Box, Group, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROLE_LABELS, ROLES, translateKey, type EmployeesListQuery } from '@app/shared';
import { SearchField } from '../../../common/SearchField';
import { PoolLegend } from './PoolMeter';

const ALL_ROLES = 'all';

type Filters = Pick<EmployeesListQuery, 'search' | 'role' | 'sort' | 'dir'>;

/** Wyszukiwarka, filtr roli i kolejność; zmiana wraca do strony 1 (stan siedzi w adresie). */
export const EmployeesFilters = ({ value, onChange }: { value: Filters; onChange: (next: Partial<Filters>) => void }) => {
  const { t } = useTranslation('employees');
  const sort = value.sort === 'days_left' ? 'left' : 'name';

  return (
    <Group gap="sm" align="flex-end">
      <SearchField label={t('search')} value={value.search} onChange={(search) => onChange({ search })} />
      <Select
        aria-label={t('filter_role')}
        data={[
          { value: ALL_ROLES, label: t('filter_role_all') },
          ...ROLES.map((r) => ({ value: r, label: translateKey(t, ROLE_LABELS[r]) })),
        ]}
        value={value.role ?? ALL_ROLES}
        onChange={(v) => onChange({ role: v === ALL_ROLES || !v ? undefined : (v as Filters['role']) })}
        allowDeselect={false}
        w={{ base: '48%', sm: 180 }}
      />
      <Select
        aria-label={t('sort')}
        data={[{ value: 'name', label: t('sort_name') }, { value: 'left', label: t('sort_left') }]}
        value={sort}
        onChange={(v) => onChange(v === 'left' ? { sort: 'days_left', dir: 'asc' } : { sort: 'name', dir: 'asc' })}
        allowDeselect={false}
        w={{ base: '48%', sm: 200 }}
      />
      <Box style={{ flex: 1 }} />
      <Box visibleFrom="sm"><PoolLegend /></Box>
    </Group>
  );
};
