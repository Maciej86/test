import { Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, getHoliday, isWeekend, translateKey } from '@app/shared';

/** Najdłuższy pasek dni; dłuższy termin pokazuje tylko podsumowanie (pasek byłby nieczytelny). */
const MAX_DAYS = 45;

/**
 * Dni wybranego terminu jeden po drugim: dzień roboczy (liczony) jasny, sobota, niedziela i święto przygaszone
 * i przekreślone, z nazwą święta w dymku. Pracownik od razu widzi, skąd bierze się liczba dni roboczych.
 */
export const DayStrip = ({ from, to }: { from: string; to: string }) => {
  const { t } = useTranslation('my-leave');
  const start = dayjs(from);
  const length = dayjs(to).diff(start, 'day') + 1;
  if (length < 1 || length > MAX_DAYS) return null;

  const days = Array.from({ length }, (_, i) => start.add(i, 'day'));

  return (
    <Group gap={4} aria-label={t('strip_aria')}>
      {days.map((d) => {
        const iso = d.format('YYYY-MM-DD');
        const holiday = getHoliday(iso);
        const off = holiday !== null || isWeekend(iso);
        const tip = holiday ? translateKey(t, holiday.label) : off ? t('strip_weekend') : t('strip_working');
        return (
          <Tooltip key={iso} label={tip}>
            <Paper
              withBorder={!off}
              w={38}
              py={4}
              ta="center"
              bg={off ? 'transparent' : 'navy.9'}
              style={off ? { border: '1px dashed var(--mantine-color-dark-4)' } : undefined}
            >
              <Stack gap={0}>
                <Text size="xs" c="dimmed" lh={1.2}>{d.locale('pl').format('dd')}</Text>
                <Text fw={off ? 400 : 700} c={off ? 'dimmed' : undefined} td={off ? 'line-through' : undefined} lh={1.3}>
                  {d.format('D')}
                </Text>
              </Stack>
            </Paper>
          </Tooltip>
        );
      })}
    </Group>
  );
};
