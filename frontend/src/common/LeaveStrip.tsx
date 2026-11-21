import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, formatDate, getHoliday, isWeekend, translateKey } from '@app/shared';
import { LegendItem } from './LegendItem';

export type StripMark = 'request' | 'approved' | 'pending' | 'none';

export interface StripRow {
  /** Rozróżnia osoby o tym samym imieniu i nazwisku (domyślnie imię i nazwisko). */
  key?: string | number;
  name: string;
  bold?: boolean;
  markOn: (iso: string) => StripMark;
}

const CELL = 30;
const NAME_WIDTH = 150;

const CELL_BG: Record<StripMark, string | undefined> = {
  request: 'var(--mantine-color-navy-6)',
  approved: 'var(--mantine-color-green-9)',
  pending: 'var(--mantine-color-yellow-8)',
  none: undefined,
};

const isOff = (iso: string) => isWeekend(iso) || getHoliday(iso) !== null;

/** Komórka dnia: wolny (weekend, święto) przekreślony linią przerywaną, dzień urlopu wypełniony kolorem. */
const DayCell = ({ iso, mark, label }: { iso: string; mark: StripMark; label: string }) => {
  const off = isOff(iso);
  return (
    <Tooltip label={label} disabled={!label}>
      <Box
        data-testid="strip-day"
        data-mark={mark}
        data-off={off}
        aria-label={label ? `${formatDate(iso)}: ${label}` : formatDate(iso) ?? undefined}
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
};

/**
 * Dni kolumnami, osoby wierszami: kto ma w tym czasie urlop (zatwierdzony, czekający, oglądany wniosek). Weekendy
 * i święta przekreślone, z nazwą święta w dymku. Na wąskim ekranie przewija się w bok. Szczegóły wniosku
 * („Kto jeszcze ma wtedy wolne”) i Pulpit (nieobecności w najbliższych 2 tygodniach).
 */
export const LeaveStrip = ({ days, rows, labels, noneLabel = '', highlight }: {
  days: string[];
  rows: StripRow[];
  /** Podpisy kolorów: w legendzie i w dymku dnia. Legenda pokazuje tylko podane. */
  labels: Partial<Record<Exclude<StripMark, 'none'>, string>>;
  /** Dymek dnia roboczego bez urlopu (pusty = bez dymku). */
  noneLabel?: string;
  /** Dzień podkreślony w nagłówku (dziś). */
  highlight?: string;
}) => {
  const { t } = useTranslation();
  const labelOf = (iso: string, mark: StripMark) => {
    const holiday = getHoliday(iso);
    if (holiday) return translateKey(t, holiday.label);
    if (isWeekend(iso)) return t('strip.weekend');
    return mark === 'none' ? noneLabel : (labels[mark] ?? '');
  };
  const legend = (Object.keys(labels) as Exclude<StripMark, 'none'>[]).filter((m) => labels[m]);

  return (
    <Stack gap={6}>
      <Box style={{ overflowX: 'auto' }}>
        <Stack gap={4} w="max-content">
          <Group gap={3} wrap="nowrap" pl={NAME_WIDTH + 3}>
            {days.map((iso) => {
              const off = isOff(iso);
              const today = iso === highlight;
              return (
                <Stack
                  key={iso}
                  data-testid="strip-header-day"
                  data-today={today}
                  gap={0}
                  w={CELL}
                  align="center"
                  style={{ flex: 'none', borderBottom: `2px solid ${today ? 'var(--mantine-color-navy-4)' : 'transparent'}` }}
                >
                  <Text fz={10} c="dimmed" lh={1.2}>{dayjs(iso).locale('pl').format('dd')}</Text>
                  <Text size="xs" fw={off ? 400 : 700} c={off ? 'dimmed' : undefined} td={off ? 'line-through' : undefined} lh={1.3}>
                    {dayjs(iso).format('D')}
                  </Text>
                </Stack>
              );
            })}
          </Group>
          {rows.map((row) => (
            <Group key={row.key ?? row.name} gap={3} wrap="nowrap" data-testid="strip-row" data-name={row.name}>
              <Text size="sm" w={NAME_WIDTH} truncate fw={row.bold ? 600 : 400} style={{ flex: 'none' }}>{row.name}</Text>
              {days.map((iso) => {
                const mark = row.markOn(iso);
                return <DayCell key={iso} iso={iso} mark={mark} label={labelOf(iso, mark)} />;
              })}
            </Group>
          ))}
        </Stack>
      </Box>
      <Group gap="md">
        {legend.map((m) => <LegendItem key={m} label={labels[m] ?? ''} swatch={{ background: CELL_BG[m] }} />)}
        <LegendItem label={t('strip.off')} swatch={{ border: '1px dashed var(--mantine-color-dark-4)' }} />
      </Group>
    </Stack>
  );
};
