import { Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function HomeMockup() {
  const { t } = useTranslation('home');
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      <Text>{t('intro', { defaultValue: '' }) || t('ready', { defaultValue: '' })}</Text>
    </Stack>
  );
}
