import { useState } from 'react';
import { ActionIcon, Drawer, Indicator, Popover, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NOTIFICATION_BADGE_MAX } from '@app/shared';
import { BellPanel } from './components/BellPanel';
import { useNotificationsSummary } from './notifications.api';

const POPOVER_WIDTH = 420;

/**
 * Dzwonek w górnej belce panelu: liczba nieprzeczytanych, a po kliknięciu ostatnie powiadomienia. Na komputerze okienko
 * pod dzwonkiem; na telefonie panel z prawej na cały ekran (okienko liczone od szerokości ekranu mrugało).
 */
export const NotificationBell = () => {
  const { t } = useTranslation('notifications');
  const theme = useMantineTheme();
  const phone = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`) ?? false;
  const [opened, setOpened] = useState(false);
  const unread = useNotificationsSummary().data?.unread ?? 0;
  const close = () => setOpened(false);

  const bell = (
    <Indicator
      label={unread > NOTIFICATION_BADGE_MAX ? `${NOTIFICATION_BADGE_MAX}+` : unread}
      size={18}
      color="red.8"
      offset={6}
      disabled={unread === 0}
      inline
    >
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
          <BellPanel onClose={close} phone />
        </Drawer>
      </>
    );
  }

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={POPOVER_WIDTH} withinPortal shadow="none">
      <Popover.Target>{bell}</Popover.Target>
      <Popover.Dropdown p={0} bg="dark.7">
        <BellPanel onClose={close} phone={false} />
      </Popover.Dropdown>
    </Popover>
  );
};
