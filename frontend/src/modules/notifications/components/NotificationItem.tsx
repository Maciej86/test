import { Box, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { Ban, Check, FilePlus2, SquareKanban, Undo2, X, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatTime, type NotificationItem as Item, type NotificationType } from '@app/shared';
import { notificationTexts } from '../notificationTexts';
import { whenLabel } from '../notificationTime';

/** Ikona i kolor rodzaju: te same kolory co statusy wniosków (docs/DESIGN.md, „Statusy”). */
const TYPE_LOOK: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  leave_request_new: { icon: FilePlus2, color: 'yellow' },
  leave_request_withdrawn: { icon: Undo2, color: 'gray' },
  leave_approved: { icon: Check, color: 'green' },
  leave_rejected: { icon: X, color: 'red' },
  leave_cancelled: { icon: Ban, color: 'red' },
  task_assigned: { icon: SquareKanban, color: 'navy' },
};

/**
 * Jedno powiadomienie. Nieprzeczytane: jaśniejsze tło, granatowy pasek po lewej (jak aktywna pozycja menu), pogrubiony
 * tytuł i kropka. `compact` (dzwonek): mniejsze, z dniem przy godzinie; na stronie dzień jest w nagłówku grupy.
 */
export const NotificationItem = ({ n, onOpen, compact = false }: { n: Item; onOpen(n: Item): void; compact?: boolean }) => {
  const { t } = useTranslation('notifications');
  const { icon: Icon, color } = TYPE_LOOK[n.type];
  const { title, detail } = notificationTexts(n, t);
  const read = n.readAt !== null;
  return (
    <UnstyledButton
      onClick={() => onOpen(n)}
      w="100%"
      px={compact ? 'sm' : 'md'}
      py="sm"
      bg={read ? undefined : 'dark.6'}
      aria-label={read ? title : `${t('unread_label')}: ${title}`}
      style={{
        borderLeft: `3px solid ${read ? 'transparent' : 'var(--mantine-color-navy-4)'}`,
        borderBottom: '1px solid var(--mantine-color-dark-5)',
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon variant="light" color={color} radius="xl" size={compact ? 30 : 34}>
          <Icon size={compact ? 16 : 18} strokeWidth={1.75} aria-hidden />
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={read ? 500 : 700} c={read ? 'dark.1' : undefined}>
            {title}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={compact ? 2 : undefined}>
            {detail}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">{compact ? whenLabel(n.createdAt, new Date(), t) : formatTime(n.createdAt)}</Text>
            {n.actorName && <Text size="xs" c="dimmed" truncate>{n.actorName}</Text>}
          </Group>
        </Stack>
        {!read && <Box mt={6} w={8} h={8} bg="navy.4" style={{ borderRadius: '50%', flexShrink: 0 }} aria-hidden />}
      </Group>
    </UnstyledButton>
  );
};
