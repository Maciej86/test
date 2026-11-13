import { Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function MyAccountPage() {
  const { t } = useTranslation('my-account');
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      <Text>{t('intro')}</Text>
    </Stack>
  );
}
