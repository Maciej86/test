import { Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { poolParts, type MockEmployee } from './data';

/**
 * Pula dni jednym paskiem: wykorzystane (przygaszone), zostało z zaległych (jaśniejszy granat, schodzą pierwsze)
 * i zostało z puli rocznej (granat). Nad paskiem liczba, która interesuje administratora najbardziej: ile zostało.
 */
export function PoolMeter({ pool }: { pool: MockEmployee['pool'] }) {
  const { t } = useTranslation('employees');

  if (!pool) {
    return (
      <Tooltip label={t('pool_none_hint')}>
        <Text size="sm" c="dimmed" w="fit-content">{t('pool_none')}</Text>
      </Tooltip>
    );
  }

  const { total, left, leftCarried, leftAnnual } = poolParts(pool);
  const pct = (days: number) => (total === 0 ? 0 : (days / total) * 100);

  return (
    <Stack gap={4} miw={200} maw={280}>
      <Group gap={6} align="baseline" wrap="nowrap">
        <Text fw={700} fz={22} lh={1} c={left === 0 ? 'red.4' : undefined}>{left}</Text>
        <Text size="sm" c="dimmed">{left === 0 ? t('pool_empty') : t('pool_left', { total })}</Text>
      </Group>
      <Progress.Root size={8} radius="xs" aria-label={t('pool_left_aria', { left, total })}>
        <Tooltip label={`${pool.used} ${t('legend_used')}`}>
          <Progress.Section value={pct(pool.used)} color="dark.4" />
        </Tooltip>
        <Tooltip label={`${leftCarried} ${t('legend_carried')}`}>
          <Progress.Section value={pct(leftCarried)} color="navy.3" />
        </Tooltip>
        <Tooltip label={`${leftAnnual} ${t('legend_annual')}`}>
          <Progress.Section value={pct(leftAnnual)} color="navy.6" />
        </Tooltip>
      </Progress.Root>
      {(leftCarried > 0 || pool.pending > 0) && (
        <Text size="xs" c="dimmed">
          {[
            leftCarried > 0 ? t('pool_carried_left', { count: leftCarried }) : null,
            pool.pending > 0 ? t('pool_pending', { count: pool.pending }) : null,
          ].filter(Boolean).join(', ')}
        </Text>
      )}
    </Stack>
  );
}

/** Objaśnienie kolorów paska, raz nad tabelą. */
export function PoolLegend() {
  const { t } = useTranslation('employees');
  const items = [
    { color: 'var(--mantine-color-dark-4)', label: t('legend_used') },
    { color: 'var(--mantine-color-navy-3)', label: t('legend_carried') },
    { color: 'var(--mantine-color-navy-6)', label: t('legend_annual') },
  ];
  return (
    <Group gap="md">
      {items.map((i) => (
        <Group key={i.label} gap={6} wrap="nowrap">
          <span style={{ width: 10, height: 10, borderRadius: 2, background: i.color, display: 'inline-block' }} />
          <Text size="xs" c="dimmed">{i.label}</Text>
        </Group>
      ))}
    </Group>
  );
}
