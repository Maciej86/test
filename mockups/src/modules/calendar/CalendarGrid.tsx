import { Box, Group, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, getHoliday, isWeekend, translateKey } from '@app/shared';
import { PersonAvatar } from '../../common/PersonAvatar';
import { typeOf, type MockAbsence, type MockEmployee } from './data';

const isOff = (iso: string) => isWeekend(iso) || getHoliday(iso) !== null;

/** Kawałek paska: kolejne dni w jednej linii. Urlop w dniach roboczych pęka na weekendy i święta. */
interface Segment {
  absence: MockAbsence;
  start: number;
  end: number;
  /** Przerwa w środku nieobecności (weekend, święto) dla typu liczonego w dniach roboczych. */
  bridge: boolean;
}

const segmentsOf = (absence: MockAbsence, days: string[]): Segment[] => {
  const calendar = typeOf(absence.typeId).dayCount === 'calendar';
  const result: Segment[] = [];
  days.forEach((iso, i) => {
    if (iso < absence.from || iso > absence.to) return;
    const bridge = !calendar && isOff(iso);
    const last = result[result.length - 1];
    if (last && last.end === i - 1 && last.bridge === bridge) last.end = i;
    else result.push({ absence, start: i, end: i, bridge });
  });
  // Przerwa na początku albo końcu widocznego zakresu nic nie łączy.
  return result.filter((s, idx) => !(s.bridge && (idx === 0 || idx === result.length - 1)));
};

const BAR_H = 26;

/**
 * Osoby w wierszach, dni w kolumnach (dziś + 60 dni). Kolumny rozciągają się na całą szerokość; na wąskim ekranie
 * siatka przewija się w bok, a kolumna z osobami zostaje na miejscu. Kolor paska = typ urlopu; wniosek, który czeka,
 * jest jasny z przerywaną ramką.
 */
export const CalendarGrid = ({ days, people, absences, today, phone, onOpen }: {
  days: string[];
  people: MockEmployee[];
  absences: MockAbsence[];
  today: string;
  phone: boolean;
  onOpen: (a: MockAbsence) => void;
}) => {
  const { t } = useTranslation('calendar');
  const { t: tc } = useTranslation();
  const labelWidth = phone ? 132 : 220;
  const minCol = phone ? 34 : 26;
  const months = days.reduce<{ key: string; start: number; count: number }[]>((acc, iso, i) => {
    const key = iso.slice(0, 7);
    const last = acc[acc.length - 1];
    if (last?.key === key) last.count += 1;
    else acc.push({ key, start: i, count: 1 });
    return acc;
  }, []);
  const col = (i: number) => i + 2;
  const sticky = { position: 'sticky' as const, left: 0, zIndex: 3, background: 'var(--mantine-color-dark-6)' };
  const line = '1px solid var(--mantine-color-dark-5)';
  /** Granica miesiąca mocniejsza niż kreska między dniami. */
  const monthLine = '1px solid var(--mantine-color-dark-3)';

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: `${labelWidth}px repeat(${days.length}, minmax(${minCol}px, 1fr))`,
          minWidth: labelWidth + days.length * minCol,
        }}
      >
        {/* Wiersz 1: miesiące */}
        <Box style={{ ...sticky, gridColumn: 1, gridRow: '1 / span 2', borderBottom: line, borderRight: line }} px="sm" py={6}>
          <Text size="sm" fw={600} c="dimmed">{t('people')}</Text>
        </Box>
        {months.map((m) => {
          const label = dayjs(`${m.key}-01`).locale('pl').format('MMMM YYYY');
          return (
            <Box key={m.key} style={{ gridColumn: `${col(m.start)} / span ${m.count}`, gridRow: 1, borderLeft: monthLine, minWidth: 0 }} px={6} pt={6}>
              <Text size="sm" fw={600} truncate style={{ position: 'sticky', left: labelWidth + 6 }}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </Text>
            </Box>
          );
        })}

        {/* Wiersz 2: dni */}
        {days.map((iso, i) => {
          const holiday = getHoliday(iso);
          const off = isOff(iso);
          const isToday = iso === today;
          return (
            <Tooltip key={iso} label={holiday ? translateKey(tc, holiday.label) : ''} disabled={!holiday}>
              <Stack
                gap={0}
                align="center"
                py={4}
                style={{
                  gridColumn: col(i),
                  gridRow: 2,
                  borderBottom: isToday ? '2px solid var(--mantine-color-navy-4)' : line,
                  background: off ? 'var(--mantine-color-dark-8)' : undefined,
                  borderLeft: iso.endsWith('-01') ? monthLine : line,
                }}
              >
                <Text fz={10} c="dimmed" lh={1.2}>{dayjs(iso).locale('pl').format('dd')}</Text>
                <Text size="xs" fw={off ? 400 : 700} c={isToday ? 'navy.3' : off ? 'dimmed' : undefined} lh={1.3}>{dayjs(iso).format('D')}</Text>
              </Stack>
            </Tooltip>
          );
        })}

        {/* Wiersze osób */}
        {people.map((p, r) => {
          const row = r + 3;
          const segments = absences.filter((a) => a.employeeId === p.id).flatMap((a) => segmentsOf(a, days));
          return [
            <Group key={`label-${p.id}`} gap="xs" wrap="nowrap" px="sm" style={{ ...sticky, gridColumn: 1, gridRow: row, borderBottom: line, borderRight: line, minHeight: 46 }}>
              {!phone && <PersonAvatar name={p.name} />}
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>{p.name}</Text>
                {!phone && <Text size="xs" c="dimmed" truncate>{p.position}</Text>}
              </Stack>
            </Group>,
            ...days.map((iso, i) => (
              <Box
                key={`cell-${p.id}-${iso}`}
                style={{
                  gridColumn: col(i),
                  gridRow: row,
                  borderBottom: line,
                  borderLeft: iso.endsWith('-01') ? monthLine : line,
                  background: isOff(iso) ? 'var(--mantine-color-dark-8)' : iso === today ? 'var(--mantine-color-navy-light)' : undefined,
                }}
              />
            )),
            ...segments.map((s) => {
              const type = typeOf(s.absence.typeId);
              const area = { gridColumn: `${col(s.start)} / ${col(s.end) + 1}`, gridRow: row, alignSelf: 'center', zIndex: 1 };
              if (s.bridge) {
                return <Box key={`bridge-${s.absence.id}-${s.start}`} h={2} style={{ ...area, background: `var(--mantine-color-${type.color}-5)`, opacity: 0.6 }} />;
              }
              const pending = s.absence.status === 'pending';
              const title = pending ? t('bar_pending', { type: type.name }) : type.name;
              return (
                <Tooltip key={`bar-${s.absence.id}-${s.start}`} label={`${p.name}: ${title}`}>
                  <UnstyledButton
                    onClick={() => onOpen(s.absence)}
                    aria-label={`${p.name}: ${title}`}
                    h={BAR_H}
                    mx={2}
                    px={4}
                    style={{
                      ...area,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 0,
                      overflow: 'hidden',
                      background: pending ? `var(--mantine-color-${type.color}-light)` : `var(--mantine-color-${type.color}-8)`,
                      border: pending ? `1px dashed var(--mantine-color-${type.color}-4)` : undefined,
                      color: pending ? `var(--mantine-color-${type.color}-light-color)` : 'var(--mantine-color-white)',
                    }}
                  >
                    <Text size="xs" fw={600} truncate ta="center" inherit={false} c="inherit">{title}</Text>
                  </UnstyledButton>
                </Tooltip>
              );
            }),
          ];
        })}
      </Box>
    </Box>
  );
};
