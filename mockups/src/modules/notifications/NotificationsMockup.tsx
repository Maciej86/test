import { useState } from 'react';
import { Button, Group, Paper, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { useMockupRole } from '../../common/mockupRole';
import { EmptyNotifications } from './NotificationBell';
import { NotificationItem } from './NotificationItem';
import { mockNotificationsStore, useMockNotifications, type MockNotification } from './data';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Nagłówek grupy: „Dzisiaj”, „Wczoraj” albo data. */
const useDayLabel = () => {
  const { t } = useTranslation('notifications');
  return (date: Date): string => {
    const day = formatDate(date) ?? '';
    if (day === formatDate(new Date())) return t('today');
    if (day === formatDate(new Date(Date.now() - DAY_MS))) return t('yesterday');
    return day;
  };
};

const groupByDay = (items: MockNotification[], label: (d: Date) => string) => {
  const groups: { label: string; items: MockNotification[] }[] = [];
  for (const n of items) {
    const l = label(n.createdAt);
    const last = groups.at(-1);
    if (last?.label === l) last.items.push(n);
    else groups.push({ label: l, items: [n] });
  }
  return groups;
};

/** Strona „Wszystkie powiadomienia”: bez pozycji w menu, otwierana z dzwonka. */
export const NotificationsMockup = () => {
  const { t } = useTranslation('notifications');
  const role = useMockupRole();
  const navigate = useNavigate();
  const { items, isEmpty, unread } = useMockNotifications(role);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dayLabel = useDayLabel();
  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const open = (n: MockNotification) => {
    mockNotificationsStore.markRead(role, n.id);
    navigate(n.link);
  };

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Text size="sm" c="dimmed">{t('mockup_state')}</Text>
        <SegmentedControl
          size="xs"
          value={isEmpty ? 'empty' : 'list'}
          onChange={(v) => mockNotificationsStore.setEmpty(v === 'empty')}
          data={(['list', 'empty'] as const).map((s) => ({ value: s, label: t(`mockup_states.${s}`) }))}
        />
      </Group>

      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={2}>{t('title')}</Title>
          <Text size="sm" c="dimmed">{t('page_hint')}</Text>
        </Stack>
        {unread > 0 && (
          <Button variant="default" leftSection={<ButtonIcon action="confirm" />} onClick={() => mockNotificationsStore.markAllRead(role)}>
            {t('mark_all_read')}
          </Button>
        )}
      </Group>

      <SegmentedControl
        style={{ alignSelf: 'flex-start' }}
        value={filter}
        onChange={(v) => setFilter(v as 'all' | 'unread')}
        data={[
          { value: 'all', label: t('filter_all') },
          { value: 'unread', label: t('filter_unread', { count: unread }) },
        ]}
      />

      {shown.length === 0 ? (
        <Paper withBorder bg="dark.7">
          <EmptyNotifications messageKey={items.length === 0 ? 'empty' : 'empty_unread'} />
        </Paper>
      ) : (
        groupByDay(shown, dayLabel).map((g) => (
          <Stack key={g.label} gap={6}>
            <Text ff="heading" fw={600} c="dark.1">{g.label}</Text>
            <Paper withBorder bg="dark.7" style={{ overflow: 'hidden' }}>
              {g.items.map((n) => (
                <NotificationItem key={n.id} n={n} onOpen={open} />
              ))}
            </Paper>
          </Stack>
        ))
      )}
    </Stack>
  );
};
