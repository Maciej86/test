import { Button, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '../../core/api/client';
import { notify } from '../../core/notify';
import { formatRelativeDay, notificationsQuerySchema, type NotificationItem as Item, type NotificationsQuery } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { ListPagination } from '../../common/ListPagination';
import { PageHeader } from '../../common/PageHeader';
import { useListParams } from '../../core/useListParams';
import { NotificationItem } from './components/NotificationItem';
import { useMarkAllRead, useNotificationsList } from './notifications.api';
import { useOpenNotification } from './useOpenNotification';

const LIST_DEFAULTS = { page: 1, unread: '0' } as const;

/** Kolejne powiadomienia (od najnowszych) w grupach po dniach. */
const groupByDay = (items: Item[], label: (iso: string) => string) => {
  const groups: { label: string; items: Item[] }[] = [];
  for (const n of items) {
    const l = label(n.createdAt);
    const last = groups.at(-1);
    if (last?.label === l) last.items.push(n);
    else groups.push({ label: l, items: [n] });
  }
  return groups;
};

/** Strona „Powiadomienia” (bez pozycji w menu, otwierana z dzwonka). */
export const NotificationsPage = () => {
  const { t } = useTranslation('notifications');
  const [params, setParams] = useListParams(notificationsQuerySchema, LIST_DEFAULTS);
  const list = useNotificationsList(params);
  const markAll = useMarkAllRead();
  const open = useOpenNotification();
  const data = list.data;
  const unread = data?.unread ?? 0;
  const now = new Date();

  return (
    <Stack gap="md">
      <PageHeader
        title={t('title')}
        subtitle={t('page_hint')}
        actions={
          unread > 0 && (
            <Button variant="default" leftSection={<ButtonIcon action="confirm" />} onClick={() => markAll.mutate(undefined, { onError: (error) => notify.error(apiErrorMessage(error, t)) })} loading={markAll.isPending}>
              {t('mark_all_read')}
            </Button>
          )
        }
      />

      <SegmentedControl
        style={{ alignSelf: 'flex-start' }}
        value={params.unread}
        onChange={(v) => setParams({ unread: v as NotificationsQuery['unread'] })}
        data={[
          { value: '0', label: t('filter_all') },
          { value: '1', label: t('filter_unread', { count: unread }) },
        ]}
      />

      <DataState query={list}>
        {data && data.items.length === 0 ? (
          <Paper withBorder bg="dark.7">
            <EmptyState icon={BellOff} text={t(params.unread === '1' ? 'empty_unread' : 'empty')} />
          </Paper>
        ) : (
          data && (
            <>
              {groupByDay(data.items, (iso) => formatRelativeDay(iso, t, now) ?? '').map((g) => (
                <Stack key={g.label} gap={6}>
                  <Text ff="heading" fw={600} c="dark.1">{g.label}</Text>
                  <Paper withBorder bg="dark.7" style={{ overflow: 'hidden' }}>
                    {g.items.map((n) => (
                      <NotificationItem key={n.id} n={n} onOpen={open} />
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
