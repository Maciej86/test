import { List, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs, type LeaveRequestDetails } from '@app/shared';
import { LeaveDates } from '../LeaveRequestParts';
import { LeaveStrip, type StripMark } from '../LeaveStrip';

/** Dłuższy termin pokazuje listę osób zamiast paska (31 kolumn mieści się jeszcze na ekranie z przewijaniem). */
const MAX_DAYS = 31;

type Other = LeaveRequestDetails['others'][number];

const markOn = (rows: Other[], iso: string): StripMark => {
  const hit = rows.find((o) => o.dateFrom <= iso && o.dateTo >= iso);
  if (!hit) return 'none';
  return hit.status === 'approved' ? 'approved' : 'pending';
};

/**
 * „Kto jeszcze ma wtedy wolne” (odpowiedź 2a): dni terminu kolumnami, pierwszy wiersz to ten wniosek, pod nim każda
 * inna osoba z urlopem zatwierdzonym albo wnioskiem czekającym w tym czasie. Rama: `LeaveStrip` (common).
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
  const rows = [
    { name: request.employeeName, bold: true, markOn: (): StripMark => 'request' },
    ...people.map((name) => ({ name, markOn: (iso: string) => markOn(others.filter((o) => o.employeeName === name), iso) })),
  ];

  return (
    <Stack gap={6}>
      <LeaveStrip
        days={days}
        rows={rows}
        labels={{ request: t('strip_request'), approved: t('strip_approved'), pending: t('strip_pending') }}
        noneLabel={t('strip_working')}
      />
      {nobody}
    </Stack>
  );
};
