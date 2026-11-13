import { Center, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function MissingScreen() {
  const { t } = useTranslation();
  return (
    <Center p="xl">
      <Text c="dimmed">{t('missing_screen')}</Text>
    </Center>
  );
}
