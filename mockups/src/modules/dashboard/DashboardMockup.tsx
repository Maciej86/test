import { SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '../../common/InfoCard';

export function DashboardMockup() {
  const { t } = useTranslation('dashboard');
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <InfoCard title={t('start_card')}>
          <Text>{t('intro', { defaultValue: '' }) || t('ready', { defaultValue: '' })}</Text>
        </InfoCard>
      </SimpleGrid>
    </Stack>
  );
}
