import { Box, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { Ban, Check, FilePlus2, SquareKanban, Undo2, X, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatRelativeDateTime, formatTime } from '@app/shared';
import type { MockNotification, NotificationType } from './data';

/** Ikona i kolor rodzaju powiadomienia: te same kolory co statusy wniosków (docs/DESIGN.md, „Statusy”). */
const TYPE_LOOK: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  leave_request_new: { icon: FilePlus2, color: 'yellow' },
  leave_request_withdrawn: { icon: Undo2, color: 'gray' },
  leave_approved: { icon: Check, color: 'green' },
  leave_rejected: { icon: X, color: 'red' },
  leave_cancelled: { icon: Ban, color: 'red' },
  task_assigned: { icon: SquareKanban, color: 'navy' },
};

/** „dzisiaj, 14:32”, „wczoraj, 09:10”, starsze z pełną datą i godziną. */
export const useWhen = () => {
  const { t } = useTranslation('notifications');
  return (date: Date): string => formatRelativeDateTime(date, t) ?? '';
};

export const notificationTexts = (n: MockNotification, t: TFunction<'notifications'>) => {
  const detailKey = n.type === 'task_assigned' && !n.params.dueDate ? 'detail_no_due' : 'detail';
  return { title: t(`types.${n.type}.title`, n.params), detail: t(`types.${n.type}.${detailKey}`, n.params) };
};

/**
 * Jedno powiadomienie. Nieprzeczytane: jaśniejsze tło i granatowy pasek po lewej (jak aktywna pozycja menu),
 * pogrubiony tytuł i kropka po prawej. Kliknięcie oznacza jako przeczytane i prowadzi do wniosku albo zadania.
 */
export const NotificationItem = ({ n, onOpen, compact = false }: {
  n: MockNotification;
  onOpen(n: MockNotification): void;
  /** W dzwonku: mniejsze i z dniem przy godzinie; na stronie dzień jest w nagłówku grupy, więc sama godzina. */
  compact?: boolean;
}) => {
  const { t } = useTranslation('notifications');
  const when = useWhen();
  const { icon: Icon, color } = TYPE_LOOK[n.type];
  const { title, detail } = notificationTexts(n, t);
  return (
    <UnstyledButton
      onClick={() => onOpen(n)}
      w="100%"
      px={compact ? 'sm' : 'md'}
      py="sm"
      bg={n.read ? undefined : 'dark.6'}
      aria-label={n.read ? title : `${t('unread_label')}: ${title}`}
      style={{
        borderLeft: `3px solid ${n.read ? 'transparent' : 'var(--mantine-color-navy-4)'}`,
        borderBottom: '1px solid var(--mantine-color-dark-5)',
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon variant="light" color={color} radius="xl" size={compact ? 30 : 34}>
          <Icon size={compact ? 16 : 18} strokeWidth={1.75} aria-hidden />
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={n.read ? 500 : 700} c={n.read ? 'dark.1' : undefined}>
            {title}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={compact ? 2 : undefined}>
            {detail}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">{compact ? when(n.createdAt) : formatTime(n.createdAt)}</Text>
            <Text size="xs" c="dimmed" truncate>{n.actor}</Text>
          </Group>
        </Stack>
        {!n.read && (
          <Box mt={6} w={8} h={8} bg="navy.4" style={{ borderRadius: '50%', flexShrink: 0 }} aria-hidden />
        )}
      </Group>
    </UnstyledButton>
  );
};
