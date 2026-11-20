import { useEffect, useState } from 'react';
import { Button, Group, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ACTIVITY_AREAS, activityLogQuerySchema, translateKey, type ActivityArea, type ActivityLogPerson, type ActivityLogQuery } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DateField } from '../../../common/DateField';
import { SearchField } from '../../../common/SearchField';

/**
 * Filtry dziennika: wyszukiwarka, obszar, kto zmienił, daty od–do (wszystko w adresie). Daty sprawdza ten sam schemat
 * co serwer: „do” przed „od” zostaje w polu z błędem i nie trafia do adresu.
 */
export const ActivityFilters = ({ params, onChange, people }: {
  params: ActivityLogQuery;
  onChange: (next: Partial<ActivityLogQuery>) => void;
  people: ActivityLogPerson[];
}) => {
  const { t } = useTranslation('activity-log');
  const [dates, setDates] = useState({ from: params.from ?? null, to: params.to ?? null });
  const [dateError, setDateError] = useState<string | null>(null);
  // Zmiana z zewnątrz („Wyczyść filtry”, przycisk wstecz): pola dat pokazują to, co jest w adresie.
  useEffect(() => {
    setDates({ from: params.from ?? null, to: params.to ?? null });
    setDateError(null);
  }, [params.from, params.to]);

  const changeDate = (field: 'from' | 'to', value: string | null) => {
    const next = { ...dates, [field]: value };
    setDates(next);
    const checked = activityLogQuerySchema.safeParse({ from: next.from ?? undefined, to: next.to ?? undefined });
    if (!checked.success) {
      setDateError(checked.error.issues[0]?.message ?? null);
      return;
    }
    setDateError(null);
    onChange({ from: next.from ?? undefined, to: next.to ?? undefined });
  };

  const used = Boolean(params.search || params.area || params.userId || params.from || params.to || dates.from || dates.to);

  return (
    <Group gap="sm" align="flex-start">
      <SearchField label={t('search')} value={params.search} onChange={(search) => onChange({ search })} w={{ base: '100%', sm: 280 }} />
      <Select
        w={{ base: '100%', xs: 200 }}
        aria-label={t('area_label')}
        placeholder={t('area_all')}
        data={ACTIVITY_AREAS.map((a) => ({ value: a, label: t(`area.${a}`) }))}
        value={params.area ?? null}
        onChange={(v) => onChange({ area: (v as ActivityArea | null) ?? undefined })}
        clearable
      />
      <Select
        w={{ base: '100%', xs: 220 }}
        aria-label={t('who_label')}
        placeholder={t('who_all')}
        data={people.map((p) => ({ value: String(p.userId), label: p.userName }))}
        value={params.userId ? String(params.userId) : null}
        onChange={(v) => onChange({ userId: v ? Number(v) : undefined })}
        clearable
        searchable
      />
      <DateField w={{ base: '100%', xs: 150 }} aria-label={t('date_from')} placeholder={t('date_from')} value={dates.from} onChange={(v) => changeDate('from', v)} />
      <DateField
        w={{ base: '100%', xs: 150 }}
        aria-label={t('date_to')}
        placeholder={t('date_to')}
        value={dates.to}
        onChange={(v) => changeDate('to', v)}
        error={dateError ? translateKey(t, dateError) : undefined}
      />
      {used && (
        <Button
          variant="subtle"
          leftSection={<ButtonIcon action="cancel" size={14} />}
          onClick={() => {
            setDates({ from: null, to: null });
            setDateError(null);
            onChange({ search: '', area: undefined, userId: undefined, from: undefined, to: undefined });
          }}
        >
          {t('clear_filters')}
        </Button>
      )}
    </Group>
  );
};
