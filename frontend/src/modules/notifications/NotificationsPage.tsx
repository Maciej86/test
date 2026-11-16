import { Button, Group, Pagination, Paper, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { notificationsQuerySchema, type NotificationItem as Item, type NotificationsQuery } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { EmptyNotifications } from './components/EmptyNotifications';
import { NotificationItem } from './components/NotificationItem';
import { useMarkAllRead, useNotificationsList } from './notifications.api';
import { dayLabel } from './notificationTime';
import { useOpenNotification } from './useOpenNotification';

/** Adres → parametry (ten sam schemat sprawdza je na serwerze); w adresie tylko to, co różni się od domyślnych. */
const useListParams = (): [NotificationsQuery, (next: Partial<NotificationsQuery>) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = Object.fromEntries(searchParams);
  const parsed = notificationsQuerySchema.safeParse(raw);
  const params = parsed.success ? parsed.data : notificationsQuerySchema.parse({ page: raw.page });
  const update = (next: Partial<NotificationsQuery>) => {
    const merged = { ...params, page: 1, ...next };
    const entries: [string, string][] = [];
    if (merged.page !== 1) entries.push(['page', String(merged.page)]);
    if (merged.unread === '1') entries.push(['unread', '1']);
    setSearchParams(new URLSearchParams(entries));
  };
  return [params, update];
};

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
  const [params, setParams] = useListParams();
  const list = useNotificationsList(params);
  const markAll = useMarkAllRead();
  const open = useOpenNotification();
  const data = list.data;
  const unread = data?.unread ?? 0;
  const now = new Date();

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={2}>{t('title')}</Title>
          <Text size="sm" c="dimmed">{t('page_hint')}</Text>
        </Stack>
        {unread > 0 && (
          <Button variant="default" leftSection={<ButtonIcon action="confirm" />} onClick={() => markAll.mutate()} loading={markAll.isPending}>
            {t('mark_all_read')}
          </Button>
        )}
      </Group>

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
            <EmptyNotifications messageKey={params.unread === '1' ? 'empty_unread' : 'empty'} />
          </Paper>
        ) : (
          data && (
            <>
              {groupByDay(data.items, (iso) => dayLabel(iso, now, t)).map((g) => (
                <Stack key={g.label} gap={6}>
                  <Text ff="heading" fw={600} c="dark.1">{g.label}</Text>
                  <Paper withBorder bg="dark.7" style={{ overflow: 'hidden' }}>
                    {g.items.map((n) => (
                      <NotificationItem key={n.id} n={n} onOpen={open} />
                    ))}
                  </Paper>
                </Stack>
              ))}
              {data.total > data.pageSize && (
                <Pagination total={Math.ceil(data.total / data.pageSize)} value={params.page} onChange={(page) => setParams({ page })} />
              )}
            </>
          )
        )}
      </DataState>
    </Stack>
  );
};
