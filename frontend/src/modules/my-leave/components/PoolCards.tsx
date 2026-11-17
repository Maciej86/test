import { Box, Group, Progress, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MyLeaveOverview } from '@app/shared';
import { InfoCard } from '../../../common/InfoCard';

/**
 * Pula roku otwartego jednym paskiem: wykorzystane, czeka na decyzję (zarezerwowane), zostało z zaległego i zostało
 * z puli rocznej. Duża liczba to dni, o które pracownik może jeszcze wnioskować.
 */
export const PoolCard = ({ pool }: { pool: MyLeaveOverview['pool'] }) => {
  const { t } = useTranslation('my-leave');
  const total = pool.annualDays + pool.carriedDays;
  const parts = [
    { key: 'used', value: pool.usedCarried + pool.usedAnnual, color: 'dark.4' },
    { key: 'pending', value: pool.pendingDays, color: 'yellow.6' },
    { key: 'carried', value: pool.leftCarriedDays, color: 'navy.3' },
    { key: 'annual', value: pool.leftDays - pool.leftCarriedDays, color: 'navy.6' },
  ];
  const pct = (days: number) => (total === 0 ? 0 : (days / total) * 100);

  return (
    <InfoCard title={t('pool_title', { year: pool.year })}>
      <Group gap="xs" align="baseline">
        <Text fz={40} fw={700} lh={1} c={pool.leftDays === 0 ? 'red.4' : undefined} data-left={pool.leftDays === 0 ? 'none' : 'some'}>
          {pool.leftDays}
        </Text>
        <Text c="dimmed">{t('pool_left', { total })}</Text>
      </Group>
      <Progress.Root size={12} radius="xs" aria-label={t('pool_aria', { left: pool.leftDays, total })}>
        {parts.map((p) => <Progress.Section key={p.key} value={pct(p.value)} color={p.color} />)}
      </Progress.Root>
      <Group gap="lg" mt={4} data-testid="pool-legend">
        {parts.map((p) => (
          <Group key={p.key} gap={6} wrap="nowrap">
            <Box w={10} h={10} bg={p.color} style={{ borderRadius: 2 }} />
            <Text size="sm">
              <Text span fw={700}>{p.value}</Text> <Text span c="dimmed">{t(`legend_${p.key}`, { year: pool.year - 1 })}</Text>
            </Text>
          </Group>
        ))}
      </Group>
      <Text size="xs" c="dimmed">{t('pool_hint', { annual: pool.annualDays, carried: pool.carriedDays, prev: pool.year - 1 })}</Text>
    </InfoCard>
  );
};

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
