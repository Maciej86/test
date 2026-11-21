import { useMemo, useState, type CSSProperties } from 'react';
import { ActionIcon, Badge, Box, Button, Chip, Group, Paper, SegmentedControl, Stack, Text, TextInput, Title, Tooltip, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ResourcesMonthView, type ScheduleEventData, type ScheduleResourceData } from '@mantine/schedule';
import { CalendarDays, ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dayjs, getPolishHolidays, isWeekend } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { DetailRow } from '../../common/DetailRow';
import { EmptyState } from '../../common/EmptyState';
import { notify } from '../../common/notify';
import { PageHeader } from '../../common/PageHeader';
import { PersonAvatar } from '../../common/PersonAvatar';
import { Question, Questions } from '../../common/Question';
import { SideDrawer } from '../../common/SideDrawer';
import { ABSENCES, EMPLOYEES, TODAY, employeeName, type MockAbsence } from './data';

const STATES = ['month', 'december', 'details_pending', 'details_approved', 'search', 'empty'] as const;
type State = (typeof STATES)[number];

const KINDS = ['leave_approved', 'leave_pending', 'sick_approved', 'sick_pending'] as const;
type Kind = (typeof KINDS)[number];

const kindOf = (a: MockAbsence): Kind => `${a.kind}_${a.status}`;

/** Kolor paska: rodzaj nieobecności (urlop zielony, chorobowe fioletowe); wniosek do zatwierdzenia jest jasny. */
const KIND_STYLE: Record<Kind, { color: string; variant: 'filled' | 'light' }> = {
  leave_approved: { color: 'green.9', variant: 'filled' },
  leave_pending: { color: 'yellow', variant: 'light' },
  sick_approved: { color: 'grape.9', variant: 'filled' },
  sick_pending: { color: 'grape', variant: 'light' },
};

const Swatch = ({ kind }: { kind: Kind }) => {
  const { color, variant } = KIND_STYLE[kind];
  const [name, shade] = color.split('.');
  return (
    <Box
      w={12}
      h={12}
      style={{
        flex: 'none',
        borderRadius: 2,
        background: variant === 'filled' ? `var(--mantine-color-${name}-${shade})` : `var(--mantine-color-${name}-light)`,
        border: variant === 'light' ? `1px dashed var(--mantine-color-${name}-4)` : undefined,
      }}
    />
  );
};

const monthLabel = (iso: string) => {
  const text = dayjs(iso).locale('pl').format('MMMM YYYY');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Szczegóły klikniętej nieobecności, z decyzją przy wniosku, który czeka. */
const AbsenceDrawer = ({ absence, onClose }: { absence: MockAbsence; onClose: () => void }) => {
  const { t } = useTranslation('calendar');
  const name = employeeName(absence.employeeId);
  return (
    <SideDrawer title={t('details_title')} onClose={onClose}>
      <Stack gap="lg">
        <Group gap="sm">
          <PersonAvatar name={name} />
          <Stack gap={0}>
            <Text fw={600}>{name}</Text>
            <Text size="sm" c="dimmed">{EMPLOYEES.find((e) => e.id === absence.employeeId)?.position}</Text>
          </Stack>
        </Group>
        <Stack gap="xs">
          <DetailRow label={t('type')}>
            <Group gap={6}><Swatch kind={kindOf(absence)} />{absence.type}</Group>
          </DetailRow>
          <DetailRow label={t('term')}>
            <DateText value={absence.from} />
            {absence.to !== absence.from && <> – <DateText value={absence.to} /></>}
          </DetailRow>
          <DetailRow label={t('days')}>{t('days_value', { count: absence.days })}</DetailRow>
          <DetailRow label={t('status_label')}>
            <Badge variant="light" color={absence.status === 'approved' ? 'green' : 'yellow'}>{t(`status.${absence.status}`)}</Badge>
          </DetailRow>
          {absence.comment && <DetailRow label={t('comment')}>{absence.comment}</DetailRow>}
          <DetailRow label={t('created_at')}><DateText value={absence.createdAt} withTime /></DetailRow>
          {absence.decidedAt && <DetailRow label={t('decided_at')}><DateText value={absence.decidedAt} withTime /></DetailRow>}
        </Stack>
        <Group justify="space-between">
          <Button variant="default" leftSection={<ButtonIcon action="details" size={16} />} onClick={() => notify.success(t('open_mockup', { id: absence.id }))}>
            {t('open_request')}
          </Button>
          {absence.status === 'pending' && (
            <Group gap="xs">
              <Button variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" size={16} />} onClick={() => notify.success(t('reject_mockup'))}>
                {t('reject')}
              </Button>
              <Button
                color="green"
                leftSection={<ButtonIcon action="confirm" size={16} />}
                onClick={() => {
                  notify.success(t('approved_toast', { name }));
                  onClose();
                }}
              >
                {t('approve')}
              </Button>
            </Group>
          )}
        </Group>
      </Stack>
    </SideDrawer>
  );
};

export const CalendarMockup = () => {
  const { t } = useTranslation('calendar');
  const [state, setState] = useState<State>('month');
  const [date, setDate] = useState(TODAY);
  const [kinds, setKinds] = useState<string[]>([...KINDS]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<MockAbsence | null>(null);
  const theme = useMantineTheme();
  const phone = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, { getInitialValueInEffect: false });

  const changeState = (s: State) => {
    setState(s);
    setOpen(null);
    setSearch(s === 'search' ? 'kow' : '');
    setDate(s === 'december' ? '2026-12-01' : TODAY);
    if (s === 'details_pending') setOpen(ABSENCES.find((a) => a.id === 21)!);
    if (s === 'details_approved') setOpen(ABSENCES.find((a) => a.id === 25)!);
  };

  const people = EMPLOYEES.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));
  const resources: ScheduleResourceData[] = people.map((e) => ({ id: e.id, label: e.name, payload: { position: e.position } }));

  const month = dayjs(date).format('YYYY-MM');
  const inMonth = ABSENCES.filter((a) => a.from.slice(0, 7) <= month && a.to.slice(0, 7) >= month);
  const shown = ABSENCES.filter((a) => kinds.includes(kindOf(a)) && people.some((p) => p.id === a.employeeId));

  const events = useMemo<ScheduleEventData[]>(() => {
    const year = dayjs(date).year();
    const holidays = getPolishHolidays(year).map((h) => h.date);
    const offDays = Array.from({ length: dayjs(date).daysInMonth() }, (_, i) => dayjs(date).startOf('month').add(i, 'day').format('YYYY-MM-DD'))
      .filter((d) => holidays.includes(d) && !isWeekend(d));
    const background: ScheduleEventData[] = people.flatMap((p) =>
      offDays.filter((d) => !shown.some((a) => a.employeeId === p.id && a.from <= d && a.to >= d)).map((d) => ({ id: `off-${p.id}-${d}`, title: '', start: `${d} 00:00:00`, end: `${d} 23:59:59`, color: 'dark.8', display: 'background' as const, resourceId: p.id })),
    );
    const bars: ScheduleEventData[] = shown.map((a) => ({
      id: a.id,
      title: a.status === 'pending' ? `${a.type} · ${t('pending_short')}` : a.type,
      start: `${a.from} 00:00:00`,
      end: `${a.to} 23:59:59`,
      color: KIND_STYLE[kindOf(a)].color,
      variant: KIND_STYLE[kindOf(a)].variant,
      resourceId: a.employeeId,
      payload: { absence: a },
    }));
    return [...background, ...bars];
  }, [date, people, shown, t]);

  const offToday = ABSENCES.filter((a) => a.from <= TODAY && a.to >= TODAY).map(
    (a) => `${employeeName(a.employeeId)} (${a.kind === 'sick' ? t('sick_short') : a.type.toLowerCase()}${a.status === 'pending' ? `, ${t('pending_short')}` : ''})`,
  );

  return (
    <Stack>
      <Questions>
        <Question
          number={1}
          about="Okno po kliknięciu paska"
          options={[
            { id: 'a', text: 'Szczegóły i od razu „Zatwierdź” / „Odrzuć” przy wniosku, który czeka (te same okna co we Wnioskach urlopowych), plus „Otwórz wniosek”' },
            { id: 'b', text: 'Tylko szczegóły i „Otwórz wniosek”; decyzje zawsze we Wnioskach urlopowych' },
          ]}
          recommended="a"
        >
          Czy w kalendarzu można od razu zatwierdzić albo odrzucić wniosek? Widać wtedy, kogo jeszcze nie będzie w tych dniach.
        </Question>
        <Question
          number={2}
          about="Wiersze z osobami"
          options={[
            { id: 'a', text: 'Wszyscy aktywni pracownicy, także ci bez nieobecności w tym miesiącu (widać, kto jest w pracy)' },
            { id: 'b', text: 'Tylko osoby, które w tym miesiącu mają urlop albo chorobowe' },
          ]}
          recommended="a"
        >
          Kogo pokazujemy w kolumnie po lewej? Osoby z Archiwum nie mają wiersza w żadnym wariancie.
        </Question>
        <Question
          number={3}
          about="Chorobowe"
          options={[
            { id: 'a', text: 'W Typach urlopów nowe pole „Rodzaj”: urlop albo chorobowe. Dopisuję typ „Chorobowe” (nie odejmuje dni z puli). Wszystkie typy z rodzajem „chorobowe” mają w kalendarzu kolor fioletowy' },
            { id: 'b', text: 'Każdy typ urlopu dostaje własny kolor do wybrania w Typach urlopów' },
          ]}
          recommended="a"
        >
          Skąd kalendarz ma wiedzieć, który typ to chorobowe? Wnioski o chorobowe składa pracownik w Moich urlopach (ustalone wcześniej).
        </Question>
        <Question
          number={4}
          about="Kolory pasków"
          options={[
            { id: 'a', text: 'Kolor mówi, co to jest (urlop zielony, chorobowe fioletowe), a wniosek do zatwierdzenia jest jasny z przerywaną ramką i dopiskiem „czeka”; urlop do zatwierdzenia żółty jak w całej aplikacji' },
            { id: 'b', text: 'Tylko dwa kolory: zielony = zatwierdzone, żółty = czeka; chorobowe rozpoznajesz po napisie na pasku' },
          ]}
          recommended="a"
        >
          Jak odróżniać urlop, chorobowe i to, co jeszcze czeka? Odrzucone, wycofane i anulowane wnioski nie pojawiają się w kalendarzu.
        </Question>
        <Question
          number={5}
          about="Zakres i telefon"
          options={[
            { id: 'a', text: 'Zawsze cały miesiąc ze strzałkami i „Dziś”; na telefonie ten sam widok przewija się w bok i od razu pokazuje dzisiejszy dzień' },
            { id: 'b', text: 'Na komputerze miesiąc, na telefonie lista nieobecności z najbliższych 2 tygodni zamiast siatki' },
          ]}
          recommended="a"
        >
          Jaki zakres dni widać naraz i jak kalendarz wygląda na telefonie?
        </Question>
        <Question
          number={6}
          about="Powiązania z innymi ekranami"
          options={[
            { id: 'a', text: 'Na Pulpicie przy boksie „Nieobecności na 2 tygodnie” przycisk „Otwórz kalendarz”, a w szczegółach wniosku przycisk „Pokaż w kalendarzu” (otwiera miesiąc tego wniosku)' },
            { id: 'b', text: 'Tylko pozycja „Kalendarz” w menu, bez przycisków na innych ekranach' },
          ]}
          recommended="a"
        >
          Czy inne ekrany mają prowadzić do kalendarza?
        </Question>
        <Question
          number={7}
          about="Klik w pusty dzień"
          options={[
            { id: 'a', text: 'Nic się nie dzieje: nieobecność zawsze zgłasza pracownik, administrator tylko decyduje' },
            { id: 'b', text: 'Administrator może wpisać chorobowe za pracownika (np. gdy ten zadzwonił, że jest chory); od razu zatwierdzone' },
          ]}
          recommended="a"
        >
          Czy administrator może sam dodać nieobecność, klikając dzień w wierszu osoby?
        </Question>
      </Questions>

      <Paper p="xs" bg="yellow.4" c="dark.9">
        <Group gap="sm">
          <Text size="sm" fw={600}>{t('mockup_state')}</Text>
          <SegmentedControl
            size="xs"
            value={state}
            onChange={(v) => changeState(v as State)}
            data={STATES.map((s) => ({ value: s, label: t(`mockup_states.${s}`) }))}
            style={{ flexWrap: 'wrap' }}
          />
        </Group>
      </Paper>

      <PageHeader
        title={t('title')}
        subtitle={
          state === 'empty'
            ? undefined
            : inMonth.length > 0
              ? t('summary', { month: monthLabel(date), count: inMonth.length, pending: inMonth.filter((a) => a.status === 'pending').length })
              : t('summary_none', { month: monthLabel(date) })
        }
      />

      {state === 'empty' ? (
        <Paper withBorder>
          <EmptyState
            icon={Users}
            title={t('empty_title')}
            text={t('empty_text')}
            action={<Button leftSection={<ButtonIcon action="add" size={16} />}>{t('empty_action')}</Button>}
          />
        </Paper>
      ) : (
        <>
          <Text fw={500}>{offToday.length > 0 ? t('today_off', { names: offToday.join(', ') }) : t('today_all')}</Text>

          <Group gap="md" align="flex-end" wrap="wrap">
            <TextInput
              leftSection={<Search size={16} />}
              placeholder={t('search')}
              aria-label={t('search')}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={{ base: '100%', sm: 260 }}
            />
            <Chip.Group multiple value={kinds} onChange={setKinds}>
              <Group gap="xs" wrap="wrap">
                {KINDS.map((k) => (
                  <Chip key={k} value={k} variant="outline" size="sm" icon={<Swatch kind={k} />}>
                    {t(`kind.${k}`)}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Group>

          {people.length === 0 ? (
            <Paper withBorder><EmptyState icon={Search} text={t('no_match')} /></Paper>
          ) : (
            <Paper withBorder style={{ overflow: 'hidden' }}>
              <Group gap="xs" p="xs" justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon variant="default" size="lg" aria-label={t('labels.previous')} onClick={() => setDate(dayjs(date).subtract(1, 'month').format('YYYY-MM-DD'))}>
                    <ChevronLeft size={18} />
                  </ActionIcon>
                  <Title order={3} miw={170} ta="center">{monthLabel(date)}</Title>
                  <ActionIcon variant="default" size="lg" aria-label={t('labels.next')} onClick={() => setDate(dayjs(date).add(1, 'month').format('YYYY-MM-DD'))}>
                    <ChevronRight size={18} />
                  </ActionIcon>
                </Group>
                <Button variant="default" leftSection={<CalendarDays size={16} />} onClick={() => setDate(TODAY)} disabled={dayjs(date).isSame(TODAY, 'month')}>
                  {t('labels.today')}
                </Button>
              </Group>
              <ResourcesMonthView
                key={`${month}-${phone}`}
                withHeader={false}
                style={phone ? { '--resources-month-view-resource-label-width': '8.5rem' } as CSSProperties : undefined}
                date={date}
                onDateChange={setDate}
                resources={resources}
                events={events}
                locale="pl"
                labels={{ ...t('labels', { returnObjects: true }) as Record<string, string> }}
                startScrollDate={phone ? TODAY : undefined}
                highlightToday={false}
                dayWidth={phone ? 40 : 31}
                rowHeight={46}
                maxEventsPerTimeSlot={1}
                renderResourceLabel={(r) => (
                  <Group gap="xs" wrap="nowrap" px="xs">
                    {!phone && <PersonAvatar name={String(r.label)} />}
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>{r.label}</Text>
                      <Text size="xs" c="dimmed" truncate>{r.payload?.position}</Text>
                    </Stack>
                  </Group>
                )}
                renderEventBody={(e) => {
                  const a = e.payload?.absence as MockAbsence | undefined;
                  if (!a) return null;
                  return (
                    <Tooltip label={`${employeeName(a.employeeId)}: ${a.type}, ${t(`status.${a.status}`).toLowerCase()}`} withinPortal>
                      <Text size="xs" fw={600} truncate>{e.title}</Text>
                    </Tooltip>
                  );
                }}
                onEventClick={(e) => e.payload?.absence && setOpen(e.payload.absence as MockAbsence)}
              />
            </Paper>
          )}

          <Group gap={6}>
            <Box w={12} h={12} style={{ borderRadius: 2, background: 'var(--mantine-color-dark-8)', border: '1px solid var(--mantine-color-dark-4)' }} />
            <Text size="xs" c="dimmed">{t('off_day')}</Text>
          </Group>
        </>
      )}

      {open && <AbsenceDrawer absence={open} onClose={() => setOpen(null)} />}
    </Stack>
  );
};
