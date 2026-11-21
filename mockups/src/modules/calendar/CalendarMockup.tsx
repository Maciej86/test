import { useState } from 'react';
import { ActionIcon, Button, Chip, Group, Paper, SegmentedControl, Stack, Text, TextInput, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { CalendarDays, ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { calendarDays, dayjs, formatDate } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ColorMark } from '../../common/ColorSwatchPicker';
import { LegendItem } from '../../common/LegendItem';
import { DateText } from '../../common/DateText';
import { EmptyState } from '../../common/EmptyState';
import { notify } from '../../common/notify';
import { PageHeader } from '../../common/PageHeader';
import { LeaveRequestDrawer, type LeaveRequestView } from '../../common/LeaveRequestDrawer';
import { CalendarGrid } from './CalendarGrid';
import { ABSENCES, EMPLOYEES, RANGE_DAYS, RANGE_STEP, TODAY, TYPES, employeeOf, typeOf, type MockAbsence } from './data';

const STATES = ['range', 'later', 'details_pending', 'details_sick', 'search', 'empty'] as const;
type State = (typeof STATES)[number];

/** Typy w filtrze i legendzie: jeden kolor = jeden przycisk (Wypoczynkowy i Na żądanie mają ten sam zielony). */
const LEGEND = TYPES.filter((tp, i) => TYPES.findIndex((o) => o.color === tp.color) === i);
const typesOfColor = (color: string) => TYPES.filter((tp) => tp.color === color).map((tp) => tp.name).join(', ');

/** Kto jeszcze ma wolne w terminie wniosku (zatwierdzone i czekające innych osób). */
const OthersList = ({ absence }: { absence: MockAbsence }) => {
  const { t } = useTranslation('leave-requests');
  const others = ABSENCES.filter((o) => o.employeeId !== absence.employeeId && o.from <= absence.to && o.to >= absence.from);
  if (others.length === 0) return <Text size="sm" c="dimmed">{t('strip_nobody')}</Text>;
  return (
    <Stack gap={2}>
      {others.map((o) => (
        <Text key={o.id} size="sm">
          {employeeOf(o.employeeId).name}: <DateText value={o.from} /> – <DateText value={o.to} />
          {o.status === 'pending' && <Text span c="dimmed"> ({t('status.pending').toLowerCase()})</Text>}
        </Text>
      ))}
    </Stack>
  );
};

/** Klik w pasek: te same szczegóły wniosku co we Wnioskach urlopowych (wspólny klocek), bez „Pokaż w kalendarzu”. */
const AbsenceDrawer = ({ absence, onClose }: { absence: MockAbsence | null; onClose: () => void }) => {
  const { t } = useTranslation('calendar');
  const view: LeaveRequestView | null = absence && {
    id: absence.id,
    employee: employeeOf(absence.employeeId).name,
    status: absence.status,
    from: absence.from,
    to: absence.to,
    typeLine: `${typeOf(absence.typeId).name}, ${t(`days_value_${typeOf(absence.typeId).dayCount}`, { count: absence.days })}`,
    late: absence.status === 'pending' && absence.from < TODAY,
    comment: absence.comment,
    createdAt: absence.createdAt,
    decided: absence.decidedAt ? { by: 'Anna Nowak', at: absence.decidedAt } : undefined,
  };
  return (
    <LeaveRequestDrawer
      request={view}
      strip={absence && <OthersList absence={absence} />}
      onClose={onClose}
      onApprove={() => { notify.success(t('approved_toast', { name: view?.employee })); onClose(); }}
      onReject={() => notify.success(t('reject_mockup'))}
      onCancel={() => notify.success(t('cancel_mockup'))}
      onPdf={() => notify.success(t('pdf_mockup'))}
    />
  );
};

export const CalendarMockup = () => {
  const { t } = useTranslation('calendar');
  const theme = useMantineTheme();
  const phone = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, { getInitialValueInEffect: false });
  const [state, setState] = useState<State>('range');
  const [start, setStart] = useState(TODAY);
  const [colors, setColors] = useState<string[]>(LEGEND.map((tp) => tp.color));
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<MockAbsence | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setOpen(null);
    setSearch(s === 'search' ? 'kow' : '');
    setStart(s === 'later' ? dayjs(TODAY).add(RANGE_STEP, 'day').format('YYYY-MM-DD') : TODAY);
    if (s === 'details_pending') setOpen(ABSENCES.find((a) => a.id === 29)!);
    if (s === 'details_sick') setOpen(ABSENCES.find((a) => a.id === 22)!);
  };

  const days = calendarDays(start, RANGE_DAYS);
  const end = days[days.length - 1]!;
  const people = EMPLOYEES.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));
  const inRange = ABSENCES.filter((a) => a.from <= end && a.to >= start);
  const shown = inRange.filter((a) => colors.includes(typeOf(a.typeId).color));
  const offToday = ABSENCES.filter((a) => a.from <= TODAY && a.to >= TODAY).map((a) => {
    const name = employeeOf(a.employeeId).name;
    const type = typeOf(a.typeId).name.toLowerCase();
    return t(a.status === 'pending' ? 'person_absence_pending' : 'person_absence', { name, type });
  });
  const shift = (step: number) => setStart(dayjs(start).add(step, 'day').format('YYYY-MM-DD'));

  return (
    <Stack>
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
            : t('summary', { count: inRange.length, pending: t('pending_count', { count: inRange.filter((a) => a.status === 'pending').length }) })
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

          <Group gap="md" align="center" wrap="wrap">
            <TextInput
              leftSection={<Search size={16} />}
              placeholder={t('search')}
              aria-label={t('search')}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={{ base: '100%', sm: 260 }}
            />
            <Chip.Group multiple value={colors} onChange={setColors}>
              <Group gap="xs" wrap="wrap">
                {LEGEND.map((tp) => (
                  <Chip key={tp.color} value={tp.color} variant="outline" size="sm" icon={<ColorMark color={tp.color} />}>
                    {typesOfColor(tp.color)}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Group>

          <Paper withBorder style={{ overflow: 'hidden' }}>
            <Group gap="xs" p="xs" justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
              <Group gap="xs" wrap="nowrap">
                <ActionIcon variant="default" size="lg" aria-label={t('previous', { count: RANGE_STEP })} onClick={() => shift(-RANGE_STEP)}>
                  <ChevronLeft size={18} />
                </ActionIcon>
                <Text fw={600} miw={phone ? 0 : 210} ta="center">{formatDate(start)} – {formatDate(end)}</Text>
                <ActionIcon variant="default" size="lg" aria-label={t('next', { count: RANGE_STEP })} onClick={() => shift(RANGE_STEP)}>
                  <ChevronRight size={18} />
                </ActionIcon>
              </Group>
              <Button variant="default" leftSection={<CalendarDays size={16} />} onClick={() => setStart(TODAY)} disabled={start === TODAY}>
                {t('today')}
              </Button>
            </Group>
            {people.length === 0 ? (
              <EmptyState icon={Search} text={t('no_match')} />
            ) : (
              <CalendarGrid days={days} people={people} absences={shown} today={TODAY} phone={phone} onOpen={setOpen} />
            )}
          </Paper>

          <Group gap="lg">
            <LegendItem label={t('legend_pending')} w={18} h={12} swatch={{ background: 'var(--mantine-color-green-light)', border: '1px dashed var(--mantine-color-green-4)' }} />
            <LegendItem label={t('off_day')} w={18} h={12} swatch={{ background: 'var(--mantine-color-dark-8)', border: '1px solid var(--mantine-color-dark-4)' }} />
            <LegendItem label={t('legend_bridge')} w={18} h={2} swatch={{ background: 'var(--mantine-color-green-5)', opacity: 0.6 }} />
          </Group>
        </>
      )}

      <AbsenceDrawer absence={open} onClose={() => setOpen(null)} />
    </Stack>
  );
};
