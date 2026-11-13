import { Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PageSection } from '../../common/PageSection';

export function HomePage() {
  const { t } = useTranslation('home');
  return (
    <PageSection>
      <Stack>
        <Title order={1}>{t('title')}</Title>
        <Text>{t('intro')}</Text>
      </Stack>
    </PageSection>
  );
}
