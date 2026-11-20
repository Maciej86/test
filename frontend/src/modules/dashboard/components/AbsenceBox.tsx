import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_ABSENCE_DAYS, ISO_DATE_FORMAT, dayjs, type DashboardAbsence } from '@app/shared';
import { InfoCard } from '../../../common/InfoCard';
import { LeaveStrip, type StripMark } from '../../../common/LeaveStrip';

/** Zatwierdzony urlop ma pierwszeństwo przed czekającym wnioskiem tego samego dnia. */
const markOn = (rows: DashboardAbsence[], iso: string): StripMark => {
  const hits = rows.filter((a) => a.dateFrom <= iso && a.dateTo >= iso);
  if (hits.length === 0) return 'none';
  return hits.some((a) => a.status === 'approved') ? 'approved' : 'pending';
};

/** Kto będzie nieobecny dziś i w 13 kolejnych dniach (urlopy zatwierdzone i czekające); tylko administrator. */
export const AbsenceBox = ({ absences, today }: { absences: DashboardAbsence[]; today: string }) => {
  const { t } = useTranslation('dashboard');
  const days = Array.from({ length: DASHBOARD_ABSENCE_DAYS }, (_, i) => dayjs(today).add(i, 'day').format(ISO_DATE_FORMAT));
  // Osoby (po numerze, nie po imieniu) w kolejności z serwera: pierwszy dzień nieobecności, potem nazwisko.
  const people = [...new Map(absences.map((a) => [a.userId, a.name])).entries()].map(([id, name]) => ({ id, name }));
  const offToday = people.filter((p) => absences.some((a) => a.userId === p.id && a.status === 'approved' && a.dateFrom <= today && a.dateTo >= today));

  return (
    <InfoCard title={t('absence.title')}>
      {people.length === 0 ? (
        <Text c="dimmed">{t('absence.empty')}</Text>
      ) : (
        <>
          <Text fw={500}>{offToday.length > 0 ? t('absence.today_off', { names: offToday.map((p) => p.name).join(', ') }) : t('absence.today_all')}</Text>
          <LeaveStrip
            days={days}
            rows={people.map((p) => ({ key: p.id, name: p.name, markOn: (iso: string) => markOn(absences.filter((a) => a.userId === p.id), iso) }))}
            labels={{ approved: t('absence.approved'), pending: t('absence.pending') }}
            highlight={today}
          />
        </>
      )}
    </InfoCard>
  );
};
