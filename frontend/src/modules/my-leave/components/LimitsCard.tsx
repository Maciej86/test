import { Group, Progress, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MyLeaveOverview } from '@app/shared';
import { InfoCard } from '../../../common/InfoCard';

/** Typy z rocznym limitem: ile dni już zajęte w roku otwartym (czekające i zatwierdzone). */
export const LimitsCard = ({ year, types }: { year: number; types: MyLeaveOverview['types'] }) => {
  const { t } = useTranslation('my-leave');
  return (
    <InfoCard title={t('limits_title', { year })}>
      {types.map((lt) => (
        <Stack key={lt.id} gap={4}>
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">{lt.name}</Text>
            <Text size="sm">
              <Text span fw={700}>{lt.usedOfLimit}</Text> <Text span c="dimmed">{t('limit_of', { limit: lt.yearlyLimit })}</Text>
            </Text>
          </Group>
          <Progress value={Math.min(100, (lt.usedOfLimit / (lt.yearlyLimit ?? 1)) * 100)} size={6} radius="xs" color="navy.4" />
        </Stack>
      ))}
      <Text size="xs" c="dimmed">{t('limits_hint')}</Text>
    </InfoCard>
  );
};
