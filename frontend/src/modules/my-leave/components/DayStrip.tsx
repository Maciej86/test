import { Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, formatDate, getHoliday, ISO_DATE_FORMAT, isWeekend, translateKey, type LeaveDayCount } from '@app/shared';

/** Najdłuższy pasek dni; dłuższy termin pokazuje tylko podsumowanie (pasek byłby nieczytelny). */
const MAX_DAYS = 45;

/**
 * Dni wybranego terminu jeden po drugim: dzień roboczy (liczony) jasny, sobota, niedziela i święto przygaszone
 * i przekreślone, z nazwą święta w dymku. Pracownik od razu widzi, skąd bierze się liczba dni roboczych.
 * Typ liczony w dniach kalendarzowych: każdy dzień się liczy (święto zostaje w dymku).
 */
export const DayStrip = ({ from, to, dayCount }: { from: string; to: string; dayCount: LeaveDayCount }) => {
  const { t } = useTranslation('my-leave');
  const start = dayjs(from, ISO_DATE_FORMAT);
  const length = dayjs(to, ISO_DATE_FORMAT).diff(start, 'day') + 1;
  if (length < 1 || length > MAX_DAYS) return null;

  const days = Array.from({ length }, (_, i) => start.add(i, 'day'));

  return (
    <Group gap={4} aria-label={t('strip_aria')}>
      {days.map((d) => {
        const iso = d.format(ISO_DATE_FORMAT);
        const holiday = getHoliday(iso);
        const off = dayCount === 'working' && (holiday !== null || isWeekend(iso));
        const tip = dayCount === 'calendar'
          ? holiday ? t('strip_counted_holiday', { holiday: translateKey(t, holiday.label) }) : t('strip_counted')
          : holiday ? translateKey(t, holiday.label) : off ? t('strip_weekend') : t('strip_working');
        return (
          <Tooltip key={iso} label={tip}>
            <Paper
              withBorder={!off}
              w={38}
              py={4}
              ta="center"
              bg={off ? 'transparent' : 'navy.9'}
              style={off ? { border: '1px dashed var(--mantine-color-dark-4)' } : undefined}
              aria-label={`${formatDate(iso)}: ${tip}`}
              data-off={off}
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
