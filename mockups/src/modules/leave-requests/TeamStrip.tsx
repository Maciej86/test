import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, getHoliday, isWeekend, translateKey } from '@app/shared';
import type { MockRequest } from './data';

/** Dłuższy termin pokazuje tylko listę osób (pasek byłby nieczytelny). */
const MAX_DAYS = 31;
const CELL = 30;

type Mark = 'request' | 'approved' | 'pending' | 'none';

const CELL_BG: Record<Mark, string | undefined> = {
  request: 'var(--mantine-color-navy-6)',
  approved: 'var(--mantine-color-green-9)',
  pending: 'var(--mantine-color-yellow-8)',
  none: undefined,
};

/** Komórka jednego dnia: dzień wolny przekreślony linią przerywaną, dzień urlopu wypełniony kolorem. */
const DayCell = ({ mark, off, tip }: { mark: Mark; off: boolean; tip: string }) => (
  <Tooltip label={tip} disabled={!tip}>
    <Box
      w={CELL}
      h={22}
      style={{
        flex: 'none',
        borderRadius: 2,
        background: off ? undefined : CELL_BG[mark],
        border: off ? '1px dashed var(--mantine-color-dark-4)' : mark === 'none' ? '1px solid var(--mantine-color-dark-5)' : undefined,
      }}
    />
  </Tooltip>
);

/**
 * Termin wniosku dzień po dniu, a pod nim wiersz dla każdej osoby, która w tym czasie ma urlop zatwierdzony albo
 * czekający. Administrator od razu widzi, czy zostanie ktoś w pracy. Weekendy i święta są przekreślone: nikt wtedy
 * nie pracuje i nie liczą się do urlopu.
 */
export const TeamStrip = ({ request, others }: { request: MockRequest; others: MockRequest[] }) => {
  const { t } = useTranslation('leave-requests');
  const start = dayjs(request.from);
  const length = dayjs(request.to).diff(start, 'day') + 1;
  const days = Array.from({ length }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));

  const people = [...new Set(others.map((o) => o.employee))];
  const markOf = (rows: MockRequest[], iso: string): Mark => {
    const hit = rows.find((o) => o.from <= iso && o.to >= iso);
    if (!hit) return 'none';
    return hit.status === 'approved' ? 'approved' : 'pending';
  };

  if (length > MAX_DAYS) return null;

  return (
    <Stack gap={6}>
      <Box style={{ overflowX: 'auto' }}>
        <Stack gap={4} w="max-content">
          <Group gap={3} wrap="nowrap" pl={150}>
            {days.map((iso) => {
              const d = dayjs(iso);
              const off = isWeekend(iso) || getHoliday(iso) !== null;
              return (
                <Stack key={iso} gap={0} w={CELL} align="center" style={{ flex: 'none' }}>
                  <Text size="10px" c="dimmed" lh={1.2}>{d.locale('pl').format('dd')}</Text>
                  <Text size="xs" fw={off ? 400 : 700} c={off ? 'dimmed' : undefined} td={off ? 'line-through' : undefined} lh={1.3}>
                    {d.format('D')}
                  </Text>
                </Stack>
              );
            })}
          </Group>
          {[{ name: request.employee, rows: null as MockRequest[] | null }, ...people.map((p) => ({ name: p, rows: others.filter((o) => o.employee === p) }))].map(
            ({ name, rows }) => (
              <Group key={name} gap={3} wrap="nowrap">
                <Text size="sm" w={147} truncate fw={rows === null ? 600 : 400} style={{ flex: 'none' }}>{name}</Text>
                {days.map((iso) => {
                  const holiday = getHoliday(iso);
                  const off = isWeekend(iso) || holiday !== null;
                  const mark: Mark = rows === null ? 'request' : markOf(rows, iso);
                  const tip = holiday ? translateKey(t, holiday.label) : off ? t('strip_weekend') : mark === 'none' ? '' : t(`strip_${mark}`);
                  return <DayCell key={iso} mark={mark} off={off} tip={tip} />;
                })}
              </Group>
            ),
          )}
        </Stack>
      </Box>
      <Group gap="md">
        {(['request', 'approved', 'pending'] as const).map((m) => (
          <Group key={m} gap={6} wrap="nowrap">
            <Box w={10} h={10} style={{ borderRadius: 2, background: CELL_BG[m] }} />
            <Text size="xs" c="dimmed">{t(`strip_${m}`)}</Text>
          </Group>
        ))}
        <Group gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 2, border: '1px dashed var(--mantine-color-dark-4)' }} />
          <Text size="xs" c="dimmed">{t('strip_off')}</Text>
        </Group>
      </Group>
      {people.length === 0 && <Text size="sm" c="dimmed">{t('strip_nobody')}</Text>}
    </Stack>
  );
};
