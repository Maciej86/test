import { useEffect, useRef, useState } from 'react';
import { Box, Group, Select, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROLE_LABELS, ROLES, translateKey, type EmployeesListQuery } from '@app/shared';
import { PoolLegend } from './PoolMeter';

/** Czas od ostatniej litery do wysłania wyszukiwania. */
const SEARCH_DELAY_MS = 300;
const ALL_ROLES = 'all';

type Filters = Pick<EmployeesListQuery, 'search' | 'role' | 'sort' | 'dir'>;

/** Wyszukiwarka, filtr roli i kolejność; zmiana wraca do strony 1 (stan siedzi w adresie). */
export function EmployeesFilters({ value, onChange }: { value: Filters; onChange: (next: Partial<Filters>) => void }) {
  const { t } = useTranslation('employees');
  const [search, setSearch] = useState(value.search);
  // Ostatnie wyszukiwanie wysłane z tego pola; inna wartość w adresie = zmiana z zewnątrz („Wyczyść”, wstecz).
  const sent = useRef(value.search);
  const sendSearch = useDebouncedCallback((s: string) => {
    sent.current = s;
    onChange({ search: s });
  }, SEARCH_DELAY_MS);
  useEffect(() => {
    if (value.search === sent.current) return;
    sendSearch.cancel();
    sent.current = value.search;
    setSearch(value.search);
  }, [value.search, sendSearch]);
  const sort = value.sort === 'days_left' ? 'left' : 'name';

  return (
    <Group gap="sm" align="flex-end">
      <TextInput
        placeholder={t('search')}
        aria-label={t('search')}
        leftSection={<Search size={16} />}
        value={search}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
          sendSearch(e.currentTarget.value);
        }}
        w={{ base: '100%', sm: 340 }}
      />
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
}
