import { useState } from 'react';
import { ActionIcon, Badge, Box, Button, Chip, ColorSwatch, Group, Paper, SegmentedControl, Stack, Text, TextInput, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { CalendarDays, ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dayjs, formatDate } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { DetailRow } from '../../common/DetailRow';
import { EmptyState } from '../../common/EmptyState';
import { notify } from '../../common/notify';
import { PageHeader } from '../../common/PageHeader';
import { PersonAvatar } from '../../common/PersonAvatar';
import { SideDrawer } from '../../common/SideDrawer';
import { CalendarGrid } from './CalendarGrid';
import { ABSENCES, EMPLOYEES, RANGE_DAYS, RANGE_STEP, TODAY, TYPES, employeeOf, typeOf, type MockAbsence } from './data';

const STATES = ['range', 'later', 'details_pending', 'details_sick', 'search', 'empty'] as const;
type State = (typeof STATES)[number];

/** Typy w filtrze i legendzie: jeden kolor = jeden przycisk (Wypoczynkowy i Na żądanie mają ten sam zielony). */
const LEGEND = TYPES.filter((tp, i) => TYPES.findIndex((o) => o.color === tp.color) === i);
const typesOfColor = (color: string) => TYPES.filter((tp) => tp.color === color).map((tp) => tp.name).join(', ');

/** Szczegóły klikniętej nieobecności, z decyzją przy wniosku, który czeka. */
const AbsenceDrawer = ({ absence, onClose }: { absence: MockAbsence; onClose: () => void }) => {
  const { t } = useTranslation('calendar');
  const person = employeeOf(absence.employeeId);
  const type = typeOf(absence.typeId);
  const status = absence.status === 'pending' ? 'pending' : type.approval ? 'approved' : 'reported';
  return (
    <SideDrawer title={t('details_title')} onClose={onClose}>
      <Stack gap="lg">
        <Group gap="sm">
          <PersonAvatar name={person.name} />
          <Text fw={600}>{person.name}</Text>
        </Group>
        <Stack gap="xs">
          <DetailRow label={t('type')}>
            <Group gap={6}><ColorSwatch color={`var(--mantine-color-${type.color}-8)`} size={12} radius={2} />{type.name}</Group>
          </DetailRow>
          <DetailRow label={t('term')}>
            <DateText value={absence.from} />
            {absence.to !== absence.from && <> – <DateText value={absence.to} /></>}
          </DetailRow>
          <DetailRow label={t('days')}>{t(`days_value_${type.dayCount}`, { count: absence.days })}</DetailRow>
          <DetailRow label={t('status_label')}>
            <Badge variant="light" color={status === 'pending' ? 'yellow' : 'green'}>{t(`status.${status}`)}</Badge>
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
                  notify.success(t('approved_toast', { name: person.name }));
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
    if (s === 'details_sick') setOpen(ABSENCES.find((a) => a.id === 25)!);
  };

  const days = Array.from({ length: RANGE_DAYS }, (_, i) => dayjs(start).add(i, 'day').format('YYYY-MM-DD'));
  const end = days[days.length - 1]!;
  const people = EMPLOYEES.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));
  const inRange = ABSENCES.filter((a) => a.from <= end && a.to >= start);
  const shown = inRange.filter((a) => colors.includes(typeOf(a.typeId).color));
  const offToday = ABSENCES.filter((a) => a.from <= TODAY && a.to >= TODAY).map((a) => {
    const name = employeeOf(a.employeeId).name;
    const type = typeOf(a.typeId).name.toLowerCase();
    return a.status === 'pending' ? `${name} (${type}, ${t('pending_short')})` : `${name} (${type})`;
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
            : t('summary', { count: inRange.length, pending: inRange.filter((a) => a.status === 'pending').length })
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
                  <Chip key={tp.color} value={tp.color} variant="outline" size="sm" icon={<ColorSwatch color={`var(--mantine-color-${tp.color}-8)`} size={12} radius={2} />}>
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
            <Group gap={6} wrap="nowrap">
              <Box w={18} h={12} style={{ borderRadius: 2, background: 'var(--mantine-color-green-light)', border: '1px dashed var(--mantine-color-green-4)' }} />
              <Text size="xs" c="dimmed">{t('legend_pending')}</Text>
            </Group>
            <Group gap={6} wrap="nowrap">
              <Box w={18} h={12} style={{ borderRadius: 2, background: 'var(--mantine-color-dark-8)', border: '1px solid var(--mantine-color-dark-4)' }} />
              <Text size="xs" c="dimmed">{t('off_day')}</Text>
            </Group>
            <Group gap={6} wrap="nowrap">
              <Box w={18} h={2} style={{ background: 'var(--mantine-color-green-5)', opacity: 0.6 }} />
              <Text size="xs" c="dimmed">{t('legend_bridge')}</Text>
            </Group>
          </Group>
        </>
      )}

      {open && <AbsenceDrawer absence={open} onClose={() => setOpen(null)} />}
    </Stack>
  );
};
