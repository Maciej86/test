import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, getHoliday, isWeekend, translateKey } from '@app/shared';
import { LegendItem } from '../../common/LegendItem';
import { ABSENCE_DAYS, ABSENCES, TODAY, type AbsenceStatus } from './data';

const CELL = 30;
const NAME_WIDTH = 170;

const CELL_BG: Record<AbsenceStatus, string> = {
  approved: 'var(--mantine-color-green-9)',
  pending: 'var(--mantine-color-yellow-8)',
};

/**
 * Najbliższe 2 tygodnie dzień po dniu, wiersz dla każdej osoby z urlopem zatwierdzonym albo czekającym. Ta sama rama
 * co „Kto jeszcze ma wtedy wolne” w szczegółach wniosku (w aplikacji: wspólny klocek w common/).
 */
export const AbsenceStrip = ({ absences = ABSENCES }: { absences?: typeof ABSENCES }) => {
  const { t } = useTranslation('dashboard');
  const start = dayjs(TODAY);
  const days = Array.from({ length: ABSENCE_DAYS }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
  const people = [...new Set(absences.map((a) => a.person))];
  const offToday = people.filter((p) => absences.some((a) => a.person === p && a.status === 'approved' && a.from <= TODAY && a.to >= TODAY));

  if (people.length === 0) return <Text c="dimmed">{t('absence.empty')}</Text>;

  return (
    <Stack gap="sm">
      <Text fw={500}>{offToday.length > 0 ? t('absence.today_off', { names: offToday.join(', ') }) : t('absence.today_all')}</Text>
      <Box style={{ overflowX: 'auto' }}>
        <Stack gap={4} w="max-content">
          <Group gap={3} wrap="nowrap" pl={NAME_WIDTH + 3}>
            {days.map((iso) => {
              const d = dayjs(iso);
              const off = isWeekend(iso) || getHoliday(iso) !== null;
              const isToday = iso === TODAY;
              return (
                <Stack
                  key={iso}
                  gap={0}
                  w={CELL}
                  align="center"
                  style={{ flex: 'none', borderBottom: isToday ? '2px solid var(--mantine-color-navy-4)' : '2px solid transparent' }}
                >
                  <Text size="10px" c="dimmed" lh={1.2}>{d.locale('pl').format('dd')}</Text>
                  <Text size="xs" fw={off ? 400 : 700} c={off ? 'dimmed' : undefined} td={off ? 'line-through' : undefined} lh={1.3}>
                    {d.format('D')}
                  </Text>
                </Stack>
              );
            })}
          </Group>
          {people.map((person) => (
            <Group key={person} gap={3} wrap="nowrap">
              <Text size="sm" w={NAME_WIDTH} truncate style={{ flex: 'none' }}>{person}</Text>
              {days.map((iso) => {
                const holiday = getHoliday(iso);
                const off = isWeekend(iso) || holiday !== null;
                const hit = absences.find((a) => a.person === person && a.from <= iso && a.to >= iso);
                const tip = holiday ? translateKey(t, holiday.label) : off ? t('absence.weekend') : hit ? t(`absence.${hit.status}`) : '';
                return (
                  <Tooltip key={iso} label={tip} disabled={!tip}>
                    <Box
                      w={CELL}
                      h={22}
                      style={{
                        flex: 'none',
                        borderRadius: 2,
                        background: off || !hit ? undefined : CELL_BG[hit.status],
                        border: off ? '1px dashed var(--mantine-color-dark-4)' : hit ? undefined : '1px solid var(--mantine-color-dark-5)',
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Group>
          ))}
        </Stack>
      </Box>
      <Group gap="md">
        {(['approved', 'pending'] as const).map((s) => <LegendItem key={s} label={t(`absence.${s}`)} swatch={{ background: CELL_BG[s] }} />)}
        <LegendItem label={t('absence.off')} swatch={{ border: '1px dashed var(--mantine-color-dark-4)' }} />
      </Group>
    </Stack>
  );
};
