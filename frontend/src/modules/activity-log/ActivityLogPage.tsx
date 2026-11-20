import { useState } from 'react';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { History, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { activityLogQuerySchema, formatRelativeDay, groupByDay } from '@app/shared';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { ListPagination } from '../../common/ListPagination';
import { PageHeader } from '../../common/PageHeader';
import { useListParams } from '../../core/useListParams';
import { useActivityLog, useActivityPeople } from './activity-log.api';
import { ActivityEntry } from './components/ActivityEntry';
import { ActivityFilters } from './components/ActivityFilters';

const LIST_DEFAULTS = { page: 1, search: '' } as const;

/** Historia zmian (tylko administrator): dziennik po dniach, filtry w adresie, wpis rozwija się z „przed → po”. */
export const ActivityLogPage = () => {
  const { t } = useTranslation('activity-log');
  const [params, setParams] = useListParams(activityLogQuerySchema, LIST_DEFAULTS);
  const list = useActivityLog(params);
  const people = useActivityPeople();
  const [openedId, setOpenedId] = useState<number | null>(null);
  const data = list.data;
  const filtersUsed = Boolean(params.search || params.area || params.userId || params.from || params.to);
  const now = new Date();

  return (
    <Stack gap="md">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <ActivityFilters params={params} onChange={setParams} people={people.data ?? []} />

      <DataState query={list}>
        {data && data.items.length === 0 ? (
          <Paper withBorder>
            {filtersUsed ? <EmptyState icon={Search} text={t('no_results')} /> : <EmptyState icon={History} title={t('empty_title')} text={t('empty')} />}
          </Paper>
        ) : (
          data && (
            <>
              <Text size="sm" c="dimmed">{t('entries_count', { count: data.total })}</Text>
              {groupByDay(data.items, (e) => formatRelativeDay(e.createdAt, t, now) ?? '').map((g) => (
                <Stack key={g.label} gap={6}>
                  <Group justify="space-between" align="baseline">
                    <Text ff="heading" fw={600} size="lg">{g.label}</Text>
                    <Text size="xs" c="dimmed">{t('entries_count', { count: g.items.length })}</Text>
                  </Group>
                  <Paper withBorder bg="dark.7" style={{ overflow: 'hidden', borderTop: 0 }}>
                    {g.items.map((e) => (
                      <ActivityEntry key={e.id} entry={e} opened={openedId === e.id} onToggle={() => setOpenedId(openedId === e.id ? null : e.id)} />
                    ))}
                  </Paper>
                </Stack>
              ))}
              <ListPagination data={data} page={params.page} onChange={(page) => setParams({ page })} />
            </>
          )
        )}
      </DataState>
    </Stack>
  );
};
