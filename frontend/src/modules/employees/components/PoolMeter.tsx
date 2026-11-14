import { Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { EmployeePool, Role } from '@app/shared';

/**
 * Pula dni jednym paskiem: wykorzystane (przygaszone), zostało z zaległych (jaśniejszy granat, schodzą pierwsze)
 * i zostało z puli rocznej (granat). Nad paskiem liczba dni, które zostały.
 */
export function PoolMeter({ pool, role }: { pool: EmployeePool | null; role: Role }) {
  const { t } = useTranslation('employees');

  if (!pool) {
    // Administrator nie ma puli; pracownik bez puli (np. konto sprzed modułu) dostaje ją w „Edytuj”.
    const admin = role === 'admin';
    return (
      <Tooltip label={t(admin ? 'pool_none_hint' : 'pool_missing_hint')}>
        <Text size="sm" c="dimmed" w="fit-content">{t(admin ? 'pool_none' : 'pool_missing')}</Text>
      </Tooltip>
    );
  }

  const total = pool.annualDays + pool.carriedDays;
  const leftAnnual = pool.leftDays - pool.leftCarriedDays;
  const used = Math.max(0, total - pool.leftDays);
  const pct = (days: number) => (total === 0 ? 0 : (days / total) * 100);
  const note = [
    pool.leftCarriedDays > 0 ? t('pool_carried_left', { count: pool.leftCarriedDays }) : null,
    pool.pendingDays > 0 ? t('pool_pending', { count: pool.pendingDays }) : null,
  ].filter(Boolean);

  return (
    <Stack gap={4} miw={200} maw={280}>
      <Group gap={6} align="baseline" wrap="nowrap">
        <Text fw={700} fz={22} lh={1} c={pool.leftDays === 0 ? 'red.4' : undefined}>{pool.leftDays}</Text>
        <Text size="sm" c="dimmed">{pool.leftDays === 0 ? t('pool_empty') : t('pool_left', { total })}</Text>
      </Group>
      <Progress.Root size={8} radius="xs" aria-label={t('pool_left_aria', { left: pool.leftDays, total })}>
        <Tooltip label={`${used} ${t('legend_used')}`}>
          <Progress.Section value={pct(used)} color="dark.4" />
        </Tooltip>
        <Tooltip label={`${pool.leftCarriedDays} ${t('legend_carried')}`}>
          <Progress.Section value={pct(pool.leftCarriedDays)} color="navy.3" />
        </Tooltip>
        <Tooltip label={`${leftAnnual} ${t('legend_annual')}`}>
          <Progress.Section value={pct(leftAnnual)} color="navy.6" />
        </Tooltip>
      </Progress.Root>
      {note.length > 0 && <Text size="xs" c="dimmed">{note.join(', ')}</Text>}
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
          <span style={{ width: 10, height: 10, borderRadius: 2, background: i.color, display: 'inline-block' }} aria-hidden />
          <Text size="xs" c="dimmed">{i.label}</Text>
        </Group>
      ))}
    </Group>
  );
}
