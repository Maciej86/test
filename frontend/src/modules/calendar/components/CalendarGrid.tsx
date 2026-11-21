import { Box, Group, Stack, Text, Tooltip, UnstyledButton, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { calendarSegments, dayjs, getHoliday, isWorkingDay, translateKey, type CalendarAbsence, type CalendarPerson } from '@app/shared';
import { PersonAvatar } from '../../../common/PersonAvatar';

const LINE = '1px solid var(--mantine-color-dark-5)';
/** Granica miesiąca mocniejsza niż kreska między dniami. */
const MONTH_LINE = '1px solid var(--mantine-color-dark-3)';
const OFF_BG = 'var(--mantine-color-dark-8)';
const BAR_HEIGHT = 26;
const ROW_MIN_HEIGHT = 46;

const monthName = (iso: string) => {
  const text = dayjs(iso).locale('pl').format('MMMM YYYY');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Kolejne dni z tego samego miesiąca: nagłówek nad nimi. */
const monthsOf = (days: readonly string[]) =>
  days.reduce<{ key: string; start: number; count: number }[]>((acc, iso, i) => {
    const key = iso.slice(0, 7);
    const last = acc[acc.length - 1];
    if (last?.key === key) last.count += 1;
    else acc.push({ key, start: i, count: 1 });
    return acc;
  }, []);

/** Pasek nieobecności: kolor typu, czekający jasny z przerywaną ramką; opis na środku, pełny w dymku. */
const Bar = ({ absence, person, column, row, onOpen }: {
  absence: CalendarAbsence;
  person: string;
  column: string;
  row: number;
  onOpen: (id: number) => void;
}) => {
  const { t } = useTranslation('calendar');
  const pending = absence.status === 'pending';
  const text = pending ? t('bar_pending', { type: absence.leaveTypeName }) : absence.leaveTypeName;
  const label = t('bar_tooltip', { name: person, text });
  const c = absence.color;
  return (
    <Tooltip label={label}>
      <UnstyledButton
        onClick={() => onOpen(absence.id)}
        aria-label={label}
        data-pending={pending}
        h={BAR_HEIGHT}
        mx={2}
        px={4}
        style={{
          gridColumn: column,
          gridRow: row,
          alignSelf: 'center',
          zIndex: 1,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 3,
          background: pending ? `var(--mantine-color-${c}-light)` : `var(--mantine-color-${c}-8)`,
          border: pending ? `1px dashed var(--mantine-color-${c}-4)` : undefined,
          color: pending ? `var(--mantine-color-${c}-light-color)` : 'var(--mantine-color-white)',
        }}
      >
        <Text size="xs" fw={600} truncate ta="center" c="inherit">{text}</Text>
      </UnstyledButton>
    </Tooltip>
  );
};

/**
 * Osoby w wierszach, dni w kolumnach. Kolumny rozciągają się na całą szerokość; na wąskim ekranie siatka przewija się
 * w bok, a kolumna z osobami zostaje. Weekendy i święta ciemniejsze; urlop w dniach roboczych pęka na nie (cienka
 * linia łączy kawałki). Dziś część 1: wszystkie typy liczą dni robocze.
 */
export const CalendarGrid = ({ days, people, absences, today, onOpen }: {
  days: string[];
  people: CalendarPerson[];
  absences: CalendarAbsence[];
  today: string;
  onOpen: (id: number) => void;
}) => {
  const { t } = useTranslation('calendar');
  const { t: tc } = useTranslation();
  const theme = useMantineTheme();
  const phone = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, { getInitialValueInEffect: false });
  const labelWidth = phone ? 132 : 220;
  const minColumn = phone ? 34 : 26;
  const col = (i: number) => i + 2;
  const sticky = { position: 'sticky' as const, left: 0, zIndex: 3, background: 'var(--mantine-color-dark-6)' };
  const dayLine = (iso: string) => (iso.endsWith('-01') ? MONTH_LINE : LINE);

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: `${labelWidth}px repeat(${days.length}, minmax(${minColumn}px, 1fr))`,
          minWidth: labelWidth + days.length * minColumn,
        }}
      >
        <Box px="sm" py={6} style={{ ...sticky, gridColumn: 1, gridRow: '1 / span 2', borderBottom: LINE, borderRight: LINE }}>
          <Text size="sm" fw={600} c="dimmed">{t('people')}</Text>
        </Box>
        {monthsOf(days).map((m) => (
          <Box key={m.key} px={6} pt={6} style={{ gridColumn: `${col(m.start)} / span ${m.count}`, gridRow: 1, borderLeft: MONTH_LINE, minWidth: 0 }}>
            <Text size="sm" fw={600} truncate style={{ position: 'sticky', left: labelWidth + 6 }}>{monthName(`${m.key}-01`)}</Text>
          </Box>
        ))}
        {days.map((iso, i) => {
          const holiday = getHoliday(iso);
          const off = !isWorkingDay(iso);
          const isToday = iso === today;
          const holidayName = holiday ? translateKey(tc, holiday.label) : undefined;
          return (
            <Tooltip key={iso} label={holidayName} disabled={!holidayName}>
              <Stack
                data-testid="calendar-day"
                data-today={isToday}
                data-off={off}
                aria-label={holidayName ? `${dayjs(iso).format('D')}: ${holidayName}` : undefined}
                gap={0}
                align="center"
                py={4}
                style={{
                  gridColumn: col(i),
                  gridRow: 2,
                  borderLeft: dayLine(iso),
                  borderBottom: isToday ? '2px solid var(--mantine-color-navy-4)' : LINE,
                  background: off ? OFF_BG : undefined,
                }}
              >
                <Text fz={10} c="dimmed" lh={1.2}>{dayjs(iso).locale('pl').format('dd')}</Text>
                <Text size="xs" fw={off ? 400 : 700} c={isToday ? 'navy.3' : off ? 'dimmed' : undefined} lh={1.3}>{dayjs(iso).format('D')}</Text>
              </Stack>
            </Tooltip>
          );
        })}

        {people.map((person, r) => {
          const row = r + 3;
          const own = absences.filter((a) => a.userId === person.id);
          return (
            <Box key={person.id} data-testid="calendar-row" data-name={person.name} style={{ display: 'contents' }}>
              <Group gap="xs" wrap="nowrap" px="sm" mih={ROW_MIN_HEIGHT} style={{ ...sticky, gridColumn: 1, gridRow: row, borderBottom: LINE, borderRight: LINE }}>
                {!phone && <PersonAvatar name={person.name} />}
                <Text size="sm" fw={500} truncate>{person.name}</Text>
              </Group>
              {days.map((iso, i) => (
                <Box
                  key={iso}
                  style={{
                    gridColumn: col(i),
                    gridRow: row,
                    borderLeft: dayLine(iso),
                    borderBottom: LINE,
                    background: !isWorkingDay(iso) ? OFF_BG : iso === today ? 'var(--mantine-color-navy-light)' : undefined,
                  }}
                />
              ))}
              {own.flatMap((a) =>
                calendarSegments(a.dateFrom, a.dateTo, days, 'working').map((s) => {
                  const column = `${col(s.start)} / ${col(s.end) + 1}`;
                  return s.bridge ? (
                    <Box
                      key={`${a.id}-${s.start}`}
                      data-testid="calendar-bridge"
                      h={2}
                      style={{ gridColumn: column, gridRow: row, alignSelf: 'center', zIndex: 1, background: `var(--mantine-color-${a.color}-5)`, opacity: 0.6 }}
                    />
                  ) : (
                    <Bar key={`${a.id}-${s.start}`} absence={a} person={person.name} column={column} row={row} onOpen={onOpen} />
                  );
                }),
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
