import { useState } from 'react';
import { ActionIcon, Box, Button, CloseButton, Drawer, Group, Indicator, Popover, ScrollArea, Stack, Text, Title, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Role } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { NotificationItem } from './NotificationItem';
import { mockNotificationsStore, useMockNotifications, type MockNotification } from './data';

export const NOTIFICATIONS_PAGE = '/admin/notifications';
/** Ile ostatnich powiadomień widać w dzwonku; resztę na stronie „Pokaż wszystkie”. */
const BELL_LIMIT = 8;
const POPOVER_WIDTH = 420;

export const EmptyNotifications = ({ messageKey }: { messageKey: 'empty' | 'empty_unread' }) => {
  const { t } = useTranslation('notifications');
  return (
    <Stack align="center" gap="xs" py="xl" px="md">
      <BellOff size={28} strokeWidth={1.5} aria-hidden color="var(--mantine-color-dark-2)" />
      <Text size="sm" c="dimmed" ta="center">{t(messageKey)}</Text>
    </Stack>
  );
};

/** Zawartość dzwonka: nagłówek, ostatnie powiadomienia i „Pokaż wszystkie”. Ta sama w okienku i w panelu na telefonie. */
const BellPanel = ({ role, onClose, phone }: { role: Role; onClose(): void; phone: boolean }) => {
  const { t } = useTranslation('notifications');
  const navigate = useNavigate();
  const { items, unread } = useMockNotifications(role);
  const go = (path: string) => {
    onClose();
    navigate(path);
  };
  const open = (n: MockNotification) => {
    mockNotificationsStore.markRead(role, n.id);
    go(n.link);
  };
  const list = items.slice(0, BELL_LIMIT).map((n) => <NotificationItem key={n.id} n={n} onOpen={open} compact />);

  return (
    <Stack gap={0} h={phone ? '100%' : undefined}>
      <Group justify="space-between" px="sm" py="xs" gap={4} style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
        <Title order={5} style={{ order: 1 }}>{t('title')}</Title>
        {phone && <CloseButton onClick={onClose} aria-label={t('close')} style={{ order: 2 }} />}
        {unread > 0 && (
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<ButtonIcon action="confirm" size={14} />}
            onClick={() => mockNotificationsStore.markAllRead(role)}
            style={{ order: phone ? 3 : 2 }}
          >
            {t('mark_all_read')}
          </Button>
        )}
      </Group>
      {items.length === 0 ? (
        <EmptyNotifications messageKey="empty" />
      ) : phone ? (
        <Box style={{ flex: 1, overflowY: 'auto' }}>{list}</Box>
      ) : (
        <ScrollArea.Autosize mah={440} type="auto">{list}</ScrollArea.Autosize>
      )}
      <Button variant="subtle" fullWidth radius={0} leftSection={<ButtonIcon action="details" />} onClick={() => go(NOTIFICATIONS_PAGE)}>
        {t('show_all')}
      </Button>
    </Stack>
  );
};

/**
 * Dzwonek w górnej belce: liczba nieprzeczytanych, a po kliknięciu ostatnie powiadomienia. Na komputerze okienko pod
 * dzwonkiem; na telefonie panel wysuwany z prawej na cały ekran (okienko liczone od szerokości ekranu mrugało).
 */
export const NotificationBell = ({ role }: { role: Role }) => {
  const { t } = useTranslation('notifications');
  const theme = useMantineTheme();
  const phone = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`) ?? false;
  const [opened, setOpened] = useState(false);
  const { unread } = useMockNotifications(role);
  const close = () => setOpened(false);

  const bell = (
    <Indicator label={unread > 99 ? '99+' : unread} size={18} color="red.8" offset={6} disabled={unread === 0} inline>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={() => setOpened((o) => !o)}
        aria-label={unread > 0 ? t('bell_unread', { count: unread }) : t('bell')}
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden />
      </ActionIcon>
    </Indicator>
  );

  if (phone) {
    return (
      <>
        {bell}
        <Drawer
          opened={opened}
          onClose={close}
          position="right"
          size="100%"
          withCloseButton={false}
          padding={0}
          styles={{ content: { background: 'var(--mantine-color-dark-7)' }, body: { height: '100%' } }}
        >
          <BellPanel role={role} onClose={close} phone />
        </Drawer>
      </>
    );
  }

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={POPOVER_WIDTH} withinPortal shadow="none">
      <Popover.Target>{bell}</Popover.Target>
      <Popover.Dropdown p={0} bg="dark.7">
        <BellPanel role={role} onClose={close} phone={false} />
      </Popover.Dropdown>
    </Popover>
  );
};
