import type { ReactNode } from 'react';
import { Box, Group, Progress, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MyLeaveOverview } from '@app/shared';
import { InfoCard } from './InfoCard';

/**
 * Pula roku otwartego jednym paskiem: wykorzystane, czeka na decyzję (zarezerwowane), zostało z zaległego i zostało
 * z puli rocznej. Duża liczba to dni, o które pracownik może jeszcze wnioskować. Moje urlopy i Pulpit (z przyciskiem
 * w `actions`).
 */
export const PoolCard = ({ pool, actions }: { pool: MyLeaveOverview['pool']; actions?: ReactNode }) => {
  const { t } = useTranslation();
  const total = pool.annualDays + pool.carriedDays;
  const parts = [
    { key: 'used', value: pool.usedCarried + pool.usedAnnual, color: 'dark.4' },
    { key: 'pending', value: pool.pendingDays, color: 'yellow.6' },
    { key: 'carried', value: pool.leftCarriedDays, color: 'navy.3' },
    // Pula obniżona poniżej wykorzystanych dni: zostało z puli rocznej to 0, nie liczba ujemna.
    { key: 'annual', value: Math.max(0, pool.leftDays - pool.leftCarriedDays), color: 'navy.6' },
  ];
  const pct = (days: number) => (total === 0 ? 0 : (days / total) * 100);

  return (
    <InfoCard title={t('pool.title', { year: pool.year })} actions={actions}>
      <Group gap="xs" align="baseline">
        <Text fz={40} fw={700} lh={1} c={pool.leftDays === 0 ? 'red.4' : undefined} data-left={pool.leftDays === 0 ? 'none' : 'some'}>
          {pool.leftDays}
        </Text>
        <Text c="dimmed">{t('pool.left', { total })}</Text>
      </Group>
      <Progress.Root size={12} radius="xs" aria-label={t('pool.aria', { left: pool.leftDays, total })}>
        {parts.map((p) => <Progress.Section key={p.key} value={pct(p.value)} color={p.color} />)}
      </Progress.Root>
      <Group gap="lg" mt={4} data-testid="pool-legend">
        {parts.map((p) => (
          <Group key={p.key} gap={6} wrap="nowrap">
            <Box w={10} h={10} bg={p.color} style={{ borderRadius: 2 }} />
            <Text size="sm">
              <Text span fw={700}>{p.value}</Text> <Text span c="dimmed">{t(`pool.legend_${p.key}`, { year: pool.year - 1 })}</Text>
            </Text>
          </Group>
        ))}
      </Group>
      <Text size="xs" c="dimmed">{t('pool.hint', { annual: pool.annualDays, carried: pool.carriedDays, prev: pool.year - 1 })}</Text>
    </InfoCard>
  );
};
