import { Box, Button, CloseButton, Group, ScrollArea, Stack, Title } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { NOTIFICATIONS_PATH } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DataState } from '../../../common/DataState';
import { useMarkAllRead, useNotificationsSummary } from '../notifications.api';
import { useOpenNotification } from '../useOpenNotification';
import { EmptyNotifications } from './EmptyNotifications';
import { NotificationItem } from './NotificationItem';

/** Zawartość dzwonka: nagłówek, ostatnie powiadomienia, „Pokaż wszystkie”. Ta sama w okienku i w panelu na telefonie. */
export const BellPanel = ({ onClose, phone }: { onClose(): void; phone: boolean }) => {
  const { t } = useTranslation('notifications');
  const navigate = useNavigate();
  const summary = useNotificationsSummary();
  const markAll = useMarkAllRead();
  const open = useOpenNotification(onClose);
  const unread = summary.data?.unread ?? 0;
  const latest = summary.data?.latest ?? [];
  const list = latest.map((n) => <NotificationItem key={n.id} n={n} onOpen={open} compact />);

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
            onClick={() => markAll.mutate(undefined, { onError: (error) => notify.error(apiErrorMessage(error, t)) })}
            loading={markAll.isPending}
            style={{ order: phone ? 3 : 2 }}
          >
            {t('mark_all_read')}
          </Button>
        )}
      </Group>
      <Box p={summary.isError ? 'sm' : 0} style={phone ? { flex: 1, overflowY: 'auto' } : undefined}>
        {/* Pusto: własny widok z ikoną dzwonka (jak w makiecie), DataState tylko ładowanie i błąd. */}
        <DataState query={summary}>
          {latest.length === 0 ? (
            <EmptyNotifications messageKey="empty" />
          ) : phone ? (
            list
          ) : (
            <ScrollArea.Autosize mah={440} type="auto">{list}</ScrollArea.Autosize>
          )}
        </DataState>
      </Box>
      <Button
        variant="subtle"
        fullWidth
        radius={0}
        leftSection={<ButtonIcon action="details" />}
        onClick={() => {
          onClose();
          navigate(NOTIFICATIONS_PATH);
        }}
      >
        {t('show_all')}
      </Button>
    </Stack>
  );
};
