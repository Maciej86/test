import { Center, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export const MissingScreen = ({ messageKey = 'missing_screen' }: { messageKey?: string }) => {
  const { t } = useTranslation();
  return (
    <Center p="xl">
      <Text c="dimmed">{t(messageKey)}</Text>
    </Center>
  );
};
