import { useState } from 'react';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import {
  CALENDAR_FROM_MAX,
  CALENDAR_FROM_MIN,
  CALENDAR_RANGE_DAYS,
  EMPLOYEES_PATH,
  ISO_DATE_FORMAT,
  calendarDays,
  calendarQuerySchema,
  dayjs,
  type CalendarResponse,
  type LeaveTypeColor,
} from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { LegendItem } from '../../common/LegendItem';
import { PageHeader } from '../../common/PageHeader';
import { DecisionWindow, type DecisionDialog } from '../../common/leave-request/DecisionModals';
import { DetailsDrawer } from '../../common/leave-request/DetailsDrawer';
import { useLeaveRequest } from '../../core/leaveRequestDecisions';
import { useCalendar } from './calendar.api';
import { CalendarFilters } from './components/CalendarFilters';
import { CalendarGrid } from './components/CalendarGrid';
import { CalendarToolbar } from './components/CalendarToolbar';

/** „Dziś nie ma: Jan Kowalski (wypoczynkowy), Ewa Mazur (na żądanie, czeka)” w kolejności wierszy. */
const offToday = (data: CalendarResponse, t: (key: string, o: Record<string, unknown>) => string) =>
  data.people.flatMap((p) =>
    data.todayOff
      .filter((a) => a.userId === p.id)
      .map((a) => t(a.status === 'pending' ? 'person_absence_pending' : 'person_absence', { name: p.name, type: a.leaveTypeName.toLowerCase() })),
  );

const Legend = () => {
  const { t } = useTranslation('calendar');
  return (
    <Group gap="lg">
      <LegendItem label={t('legend_pending')} w={18} h={12} swatch={{ background: 'var(--mantine-color-green-light)', border: '1px dashed var(--mantine-color-green-4)' }} />
      <LegendItem label={t('off_day')} w={18} h={12} swatch={{ background: 'var(--mantine-color-dark-8)', border: '1px solid var(--mantine-color-dark-4)' }} />
      <LegendItem label={t('legend_bridge')} w={18} h={2} swatch={{ background: 'var(--mantine-color-green-5)', opacity: 0.6 }} />
    </Group>
  );
};

/**
 * „Kalendarz” (administrator): kto jest nieobecny od dnia z adresu (`?from=`, brak = dziś) przez 61 dni. Klik w pasek
 * otwiera te same szczegóły wniosku co we Wnioskach urlopowych, z decyzją przy czekającym.
 */
export const CalendarPage = () => {
  const { t } = useTranslation('calendar');
  const [params, setParams] = useSearchParams();
  const from = calendarQuerySchema.safeParse({ from: params.get('from') ?? undefined }).data?.from ?? null;
  const calendar = useCalendar(from);
  const [search, setSearch] = useState('');
  const [hidden, setHidden] = useState<LeaveTypeColor[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DecisionDialog | null>(null);
  const details = useLeaveRequest(openId);
  const data = calendar.data;

  // Od początku z adresu (brak = dziś według serwera), nie od ostatniej odpowiedzi: dwa szybkie kliknięcia to 60 dni.
  const shifted = (days: number) => (data ? dayjs(from ?? data.today).add(days, 'day').format(ISO_DATE_FORMAT) : null);
  // Poza 2000–2099 serwer odmówi, a adres wróciłby do dziś: strzałka przy granicy jest wyłączona.
  const canShift = (days: number) => {
    const next = shifted(days);
    return next !== null && next >= CALENDAR_FROM_MIN && next <= CALENDAR_FROM_MAX;
  };
  const shift = (days: number) => {
    const next = shifted(days);
    if (next && canShift(days)) setParams({ from: next });
  };
  const people = data?.people.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  const absences = data?.absences.filter((a) => !hidden.includes(a.color)) ?? [];
  const names = data ? offToday(data, t) : [];

  return (
    <Stack>
      <PageHeader
        title={t('title')}
        subtitle={data && data.people.length > 0 && t('summary', { count: data.absences.length, pending: t('pending_count', { count: data.absences.filter((a) => a.status === 'pending').length }) })}
      />
      <DataState query={calendar}>
        {data && data.people.length === 0 && (
          <Paper withBorder>
            <EmptyState
              icon={Users}
              title={t('empty_title')}
              text={t('empty_text')}
              action={<Button component={Link} to={EMPLOYEES_PATH} leftSection={<ButtonIcon action="add" />}>{t('empty_action')}</Button>}
            />
          </Paper>
        )}
        {data && data.people.length > 0 && (
          <>
            <Text fw={500}>{names.length > 0 ? t('today_off', { names: names.join(', ') }) : t('today_all')}</Text>
            <CalendarFilters search={search} onSearch={setSearch} absences={data.absences} hidden={hidden} onHidden={setHidden} />
            <Paper withBorder style={{ overflow: 'hidden' }}>
              <CalendarToolbar from={data.from} to={data.to} today={data.today} canShift={canShift} onShift={shift} onToday={() => setParams({})} />
              {people.length === 0 ? (
                <EmptyState icon={Search} text={t('no_match')} />
              ) : (
                <CalendarGrid days={calendarDays(data.from, CALENDAR_RANGE_DAYS)} people={people} absences={absences} today={data.today} onOpen={setOpenId} />
              )}
            </Paper>
            <Legend />
          </>
        )}
      </DataState>

      <DetailsDrawer
        id={openId}
        details={details}
        onClose={() => setOpenId(null)}
        onApprove={(request) => setDialog({ kind: 'approve', request })}
        onReject={(request) => setDialog({ kind: 'reject', request })}
        onCancel={(request) => setDialog({ kind: 'cancel', request })}
      />
      {dialog && <DecisionWindow key={`${dialog.kind}-${dialog.request.id}`} dialog={dialog} onClose={() => setDialog(null)} onDone={() => setOpenId(null)} />}
    </Stack>
  );
};
