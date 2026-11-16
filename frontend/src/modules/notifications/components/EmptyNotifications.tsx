import { Stack, Text } from '@mantine/core';
import { BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const EmptyNotifications = ({ messageKey }: { messageKey: 'empty' | 'empty_unread' }) => {
  const { t } = useTranslation('notifications');
  return (
    <Stack align="center" gap="xs" py="xl" px="md">
      <BellOff size={28} strokeWidth={1.5} aria-hidden color="var(--mantine-color-dark-2)" />
      <Text size="sm" c="dimmed" ta="center">{t(messageKey)}</Text>
    </Stack>
  );
};
