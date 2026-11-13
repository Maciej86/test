import { SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '../../common/InfoCard';

/** Pulpit: podsumowanie w boksach (InfoCard). Moduły dopisują tu swoje boksy. */
export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <InfoCard title={t('start_card')}>
          <Text>{t('ready')}</Text>
        </InfoCard>
      </SimpleGrid>
    </Stack>
  );
}
