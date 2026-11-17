import { Box, Group, List, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, formatDate, getHoliday, isWeekend, translateKey, type LeaveRequestDetails } from '@app/shared';
import { LeaveDates } from '../../../common/LeaveRequestParts';

/** Dłuższy termin pokazuje listę osób zamiast paska (31 kolumn mieści się jeszcze na ekranie z przewijaniem). */
const MAX_DAYS = 31;
const CELL = 30;
const NAME_WIDTH = 150;

type Mark = 'request' | 'approved' | 'pending' | 'none';
type Other = LeaveRequestDetails['others'][number];

const CELL_BG: Record<Mark, string | undefined> = {
  request: 'var(--mantine-color-navy-6)',
  approved: 'var(--mantine-color-green-9)',
  pending: 'var(--mantine-color-yellow-8)',
  none: undefined,
};

const markOn = (rows: Other[], iso: string): Mark => {
  const hit = rows.find((o) => o.dateFrom <= iso && o.dateTo >= iso);
  if (!hit) return 'none';
  return hit.status === 'approved' ? 'approved' : 'pending';
};

/** Komórka dnia: wolny (weekend, święto) przekreślony linią przerywaną, dzień urlopu wypełniony kolorem. */
const DayCell = ({ iso, mark, label }: { iso: string; mark: Mark; label: string }) => {
  const off = isWeekend(iso) || getHoliday(iso) !== null;
  return (
    <Tooltip label={label}>
      <Box
        data-testid="strip-day"
        data-mark={mark}
        data-off={off}
        aria-label={`${formatDate(iso)}: ${label}`}
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

const Legend = () => {
  const { t } = useTranslation('leave-requests');
  const box = (style: object, label: string) => (
    <Group key={label} gap={6} wrap="nowrap">
      <Box w={10} h={10} style={{ borderRadius: 2, ...style }} />
      <Text size="xs" c="dimmed">{label}</Text>
    </Group>
  );
  return (
    <Group gap="md">
      {(['request', 'approved', 'pending'] as const).map((m) => box({ background: CELL_BG[m] }, t(`strip_${m}`)))}
      {box({ border: '1px dashed var(--mantine-color-dark-4)' }, t('strip_off'))}
    </Group>
  );
};

/**
 * „Kto jeszcze ma wtedy wolne” (odpowiedź 2a): dni terminu kolumnami, pierwszy wiersz to ten wniosek, pod nim każda
 * inna osoba z urlopem zatwierdzonym albo wnioskiem czekającym w tym czasie. Weekendy i święta przekreślone.
 */
export const TeamStrip = ({ request, others }: {
  request: Pick<LeaveRequestDetails, 'employeeName' | 'dateFrom' | 'dateTo'>;
  others: Other[];
}) => {
  const { t } = useTranslation('leave-requests');
  const start = dayjs(request.dateFrom);
  const length = dayjs(request.dateTo).diff(start, 'day') + 1;
  const people = [...new Set(others.map((o) => o.employeeName))];
  const nobody = people.length === 0 && <Text size="sm" c="dimmed">{t('strip_nobody')}</Text>;

  if (length > MAX_DAYS) {
    return (
      <Stack gap={6}>
        <List size="sm" spacing={4}>
          {others.map((o) => (
            <List.Item key={`${o.employeeName}-${o.dateFrom}`}>
              {o.employeeName}: <LeaveDates from={o.dateFrom} to={o.dateTo} /> ({t(`strip_${o.status === 'approved' ? 'approved' : 'pending'}`)})
            </List.Item>
          ))}
        </List>
        {nobody}
      </Stack>
    );
  }

  const days = Array.from({ length }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
  const labelOf = (iso: string, mark: Mark) => {
    const holiday = getHoliday(iso);
    if (holiday) return translateKey(t, holiday.label);
    if (isWeekend(iso)) return t('strip_weekend');
    return mark === 'none' ? t('strip_working') : t(`strip_${mark}`);
  };
  const rows = [
    { name: request.employeeName, mark: (): Mark => 'request', own: true },
    ...people.map((name) => ({ name, mark: (iso: string) => markOn(others.filter((o) => o.employeeName === name), iso), own: false })),
  ];

  return (
    <Stack gap={6}>
      <Box style={{ overflowX: 'auto' }}>
        <Stack gap={4} w="max-content">
          <Group gap={3} wrap="nowrap" pl={NAME_WIDTH + 3}>
            {days.map((iso) => {
              const off = isWeekend(iso) || getHoliday(iso) !== null;
              return (
                <Stack key={iso} gap={0} w={CELL} align="center" style={{ flex: 'none' }}>
                  <Text fz={10} c="dimmed" lh={1.2}>{dayjs(iso).locale('pl').format('dd')}</Text>
                  <Text size="xs" fw={off ? 400 : 700} c={off ? 'dimmed' : undefined} td={off ? 'line-through' : undefined} lh={1.3}>
                    {dayjs(iso).format('D')}
                  </Text>
                </Stack>
              );
            })}
          </Group>
          {rows.map((row) => (
            <Group key={row.name} gap={3} wrap="nowrap" data-testid="strip-row" data-name={row.name}>
              <Text size="sm" w={NAME_WIDTH} truncate fw={row.own ? 600 : 400} style={{ flex: 'none' }}>{row.name}</Text>
              {days.map((iso) => {
                const mark = row.mark(iso);
                return <DayCell key={iso} iso={iso} mark={mark} label={labelOf(iso, mark)} />;
              })}
            </Group>
          ))}
        </Stack>
      </Box>
      <Legend />
      {nobody}
    </Stack>
  );
};
