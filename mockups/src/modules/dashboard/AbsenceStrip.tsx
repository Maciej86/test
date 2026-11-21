import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { dayjs } from '@app/shared';
import { LeaveStrip, type StripMark } from '../../common/LeaveStrip';
import { ABSENCE_DAYS, ABSENCES, TODAY } from './data';

type Absence = (typeof ABSENCES)[number];

/** Zatwierdzony urlop ma pierwszeństwo przed czekającym wnioskiem tego samego dnia. */
const markOn = (rows: Absence[], iso: string): StripMark => {
  const hits = rows.filter((a) => a.from <= iso && a.to >= iso);
  if (hits.length === 0) return 'none';
  return hits.some((a) => a.status === 'approved') ? 'approved' : 'pending';
};

/**
 * Najbliższe 2 tygodnie dzień po dniu, wiersz dla każdej osoby z urlopem zatwierdzonym albo czekającym. Rama:
 * wspólny `LeaveStrip` (jak „Kto jeszcze ma wtedy wolne” w szczegółach wniosku).
 */
export const AbsenceStrip = ({ absences = ABSENCES }: { absences?: Absence[] }) => {
  const { t } = useTranslation('dashboard');
  const days = Array.from({ length: ABSENCE_DAYS }, (_, i) => dayjs(TODAY).add(i, 'day').format('YYYY-MM-DD'));
  const people = [...new Set(absences.map((a) => a.person))];
  const offToday = people.filter((p) => absences.some((a) => a.person === p && a.status === 'approved' && a.from <= TODAY && a.to >= TODAY));

  if (people.length === 0) return <Text c="dimmed">{t('absence.empty')}</Text>;

  return (
    <Stack gap="sm">
      <Text fw={500}>{offToday.length > 0 ? t('absence.today_off', { names: offToday.join(', ') }) : t('absence.today_all')}</Text>
      <LeaveStrip
        days={days}
        rows={people.map((name) => ({ name, markOn: (iso: string) => markOn(absences.filter((a) => a.person === name), iso) }))}
        labels={{ approved: t('absence.approved'), pending: t('absence.pending') }}
        highlight={TODAY}
      />
    </Stack>
  );
};
