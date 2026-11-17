import { useState } from 'react';
import { Button, Grid, Group, Select, Stack, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { myLeaveRequestsQuerySchema, type MyLeaveRequest } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { PageHeader } from '../../common/PageHeader';
import { useListParams } from '../../core/useListParams';
import { LimitsCard, PoolCard } from './components/PoolCards';
import { RequestCards, RequestsTable } from './components/RequestsTable';
import { useMyLeaveOverview, useMyRequests } from './my-leave.api';

/** Ekran „Moje urlopy” (pracownik): pula i limity roku otwartego, wnioski z wybranego roku, złożenie i wycofanie. */
export const MyLeavePage = () => {
  const { t } = useTranslation('my-leave');
  const overview = useMyLeaveOverview();
  const [params, setParams] = useListParams(myLeaveRequestsQuerySchema, {});
  const requests = useMyRequests(params.year);
  const [, setDialog] = useState<{ kind: 'new' } | { kind: 'withdraw'; request: MyLeaveRequest } | null>(null);

  const data = overview.data;
  const shownYear = requests.data?.year ?? params.year ?? data?.pool.year;
  const years = [...new Set([...(data?.years ?? []), ...(shownYear ? [shownYear] : [])])].sort((a, b) => b - a);
  const limited = data?.types.filter((lt) => lt.yearlyLimit !== null) ?? [];
  const openNew = () => setDialog({ kind: 'new' });
  const newButton = (
    <Button leftSection={<ButtonIcon action="add" />} onClick={openNew} disabled={!data}>
      {t('new_request')}
    </Button>
  );
  const items = requests.data?.items ?? [];
  const onWithdraw = (request: MyLeaveRequest) => setDialog({ kind: 'withdraw', request });

  return (
    <Stack>
      <PageHeader title={t('title')} subtitle={t('summary')} actions={newButton} />

      <DataState query={overview}>
        {data && (
          <Grid>
            <Grid.Col span={{ base: 12, md: limited.length > 0 ? 8 : 12 }}><PoolCard pool={data.pool} /></Grid.Col>
            {limited.length > 0 && (
              <Grid.Col span={{ base: 12, md: 4 }}><LimitsCard year={data.pool.year} types={limited} /></Grid.Col>
            )}
          </Grid>
        )}
      </DataState>

      <Group justify="space-between" align="flex-end" mt="md">
        <Title order={2} size="h3">{t('history')}</Title>
        <Select
          w={120}
          aria-label={t('year')}
          data={years.map(String)}
          value={shownYear ? String(shownYear) : null}
          onChange={(v) => v && setParams({ year: Number(v) })}
          allowDeselect={false}
        />
      </Group>

      <DataState query={requests} isEmpty={items.length === 0} emptyText={t('empty')} emptyAction={newButton}>
        <RequestsTable rows={items} onWithdraw={onWithdraw} />
        <RequestCards rows={items} onWithdraw={onWithdraw} />
      </DataState>
    </Stack>
  );
};
