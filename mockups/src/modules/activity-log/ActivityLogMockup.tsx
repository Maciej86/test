import { useState } from 'react';
import { Badge, Button, Collapse, Group, Paper, SegmentedControl, Select, Stack, Text, TextInput, ThemeIcon, UnstyledButton } from '@mantine/core';
import { ArrowRight, CalendarDays, ChevronDown, FileSignature, FolderKanban, History, PieChart, Search, SquareKanban, Tags, UserRound, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatRelativeDay, formatTime, groupByDay } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateField } from '../../common/DateField';
import { EmptyState } from '../../common/EmptyState';
import { ListPagination } from '../../common/ListPagination';
import { PageHeader } from '../../common/PageHeader';
import { notify } from '../../common/notify';
import { AREAS, ENTRIES, PEOPLE, TOTAL_ENTRIES, type Area, type MockEntry, type Tone } from './data';

const STATES = ['list', 'expanded', 'deleted', 'filtered', 'no_results', 'empty'] as const;
type State = (typeof STATES)[number];

const AREA_ICON: Record<Area, LucideIcon> = {
  leave_requests: CalendarDays,
  leave_pools: PieChart,
  tasks: SquareKanban,
  projects: FolderKanban,
  users: UserRound,
  leave_types: Tags,
  contract_types: FileSignature,
};

const TONE_COLOR: Record<Tone, string> = { neutral: 'navy', positive: 'green', negative: 'red', muted: 'gray' };

/** „Przed → po” dla każdego zmienionego pola; stara wartość przekreślona i przygaszona. */
const Changes = ({ entry }: { entry: MockEntry }) => {
  const { t } = useTranslation('activity-log');
  if (entry.changes.length === 0) return <Text size="sm" c="dimmed">{t('no_changes')}</Text>;
  return (
    <Stack gap={6}>
      {entry.changes.map((c) => (
        <Group key={c.field} gap="xs" align="baseline" wrap="nowrap">
          <Text size="sm" c="dimmed" w={{ base: 110, sm: 150 }} style={{ flexShrink: 0 }}>{t(`fields.${c.field}`)}</Text>
          <Group gap={6} align="baseline" wrap="wrap" style={{ minWidth: 0 }}>
            {c.before !== null && (
              <>
                <Text size="sm" c="dimmed" td="line-through">{c.before}</Text>
                <ArrowRight size={14} aria-hidden style={{ alignSelf: 'center', color: 'var(--mantine-color-dimmed)' }} />
              </>
            )}
            <Text size="sm" fw={500}>{c.after ?? t('values.none')}</Text>
          </Group>
        </Group>
      ))}
    </Stack>
  );
};

const OpenButton = ({ entry }: { entry: MockEntry }) => {
  const { t } = useTranslation('activity-log');
  if (entry.deleted) return <Text size="xs" c="dimmed">{t('deleted_hint')}</Text>;
  // Przycisk „Otwórz w archiwum” dojdzie z modułem Archiwum.
  if (entry.archived) return <Text size="xs" c="dimmed">{t('archived_hint')}</Text>;
  return (
    <Button
      size="xs"
      variant="default"
      leftSection={<ButtonIcon action="details" size={14} />}
      onClick={() => notify.success(t(`open.${entry.area}`))}
      style={{ alignSelf: 'flex-start' }}
    >
      {t(`open.${entry.area}`)}
    </Button>
  );
};

/** Jeden wpis: godzina, ikona obszaru w kolorze rodzaju zmiany, co się stało, czego dotyczy, kto. Kliknięcie rozwija. */
const EntryRow = ({ entry, opened, onToggle }: { entry: MockEntry; opened: boolean; onToggle: () => void }) => {
  const { t } = useTranslation('activity-log');
  const Icon = AREA_ICON[entry.area];
  return (
    <div style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
      <UnstyledButton
        onClick={onToggle}
        aria-expanded={opened}
        w="100%"
        px="md"
        py="sm"
        bg={opened ? 'dark.6' : undefined}
        style={{ display: 'block' }}
      >
        <Group gap="md" wrap="nowrap" align="flex-start">
          <Text size="sm" c="dimmed" w={42} pt={4} style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(entry.at)}
          </Text>
          <ThemeIcon variant="light" color={TONE_COLOR[entry.tone]} size={30} radius="md" style={{ flexShrink: 0 }}>
            <Icon size={16} aria-hidden />
          </ThemeIcon>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="wrap">
              <Text fw={600}>{t(`actions.${entry.action}`)}</Text>
              {entry.deleted && <Badge size="sm" variant="light" color="gray">{t('deleted')}</Badge>}
              {entry.archived && <Badge size="sm" variant="light" color="gray">{t('archived')}</Badge>}
            </Group>
            <Text size="sm">
              {entry.target}
              {entry.detail && <Text span c="dimmed">{t('with_context', { context: entry.detail })}</Text>}
            </Text>
            <Text size="sm" c="dimmed" hiddenFrom="sm">{entry.who}</Text>
          </Stack>
          <Text size="sm" c="dark.1" visibleFrom="sm" ta="right" w={180} pt={4} style={{ flexShrink: 0 }}>{entry.who}</Text>
          <ChevronDown
            size={18}
            aria-hidden
            style={{ flexShrink: 0, marginTop: 6, color: 'var(--mantine-color-dimmed)', transform: opened ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }}
          />
        </Group>
      </UnstyledButton>
      <Collapse expanded={opened}>
        <Stack gap="sm" px="md" pb="md" pt="xs" bg="dark.6" pl={{ base: 'md', sm: 112 }}>
          <Text size="xs" fw={600} c="dark.1">{t('changes_title')}</Text>
          <Changes entry={entry} />
          <OpenButton entry={entry} />
        </Stack>
      </Collapse>
    </div>
  );
};

export const ActivityLogMockup = () => {
  const { t } = useTranslation('activity-log');
  const [state, setState] = useState<State>('list');
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setSearch('');
    setArea(null);
    setWho(null);
    setFrom(null);
    setTo(null);
    setOpenedId(null);
    if (s === 'expanded') setOpenedId(410);
    if (s === 'deleted') setOpenedId(407);
    if (s === 'filtered') { setWho('Anna Nowak'); setArea('leave_requests'); }
    if (s === 'no_results') setSearch('Kaufland');
  };

  const query = search.trim().toLowerCase();
  const rows = state === 'empty'
    ? []
    : ENTRIES.filter((e) =>
        (!area || e.area === area) &&
        (!who || e.who === who) &&
        (!from || e.at.slice(0, 10) >= from) &&
        (!to || e.at.slice(0, 10) <= to) &&
        (query === '' || `${e.target} ${e.who} ${e.detail ?? ''}`.toLowerCase().includes(query)),
      );
  const filtersUsed = Boolean(query || area || who || from || to);
  const dayLabel = (at: string) => formatRelativeDay(at, t) ?? '';

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

      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Group gap="sm" align="flex-end">
        <TextInput
          placeholder={t('search')}
          aria-label={t('search')}
          leftSection={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={{ base: '100%', sm: 240 }}
        />
        <Select
          w={{ base: '100%', xs: 180 }}
          aria-label={t('area_label')}
          placeholder={t('area_all')}
          data={AREAS.map((a) => ({ value: a, label: t(`area.${a}`) }))}
          value={area}
          onChange={setArea}
          clearable
        />
        <Select
          w={{ base: '100%', xs: 200 }}
          aria-label={t('who_label')}
          placeholder={t('who_all')}
          data={PEOPLE}
          value={who}
          onChange={setWho}
          clearable
          searchable
        />
        <DateField w={{ base: '100%', xs: 140 }} aria-label={t('date_from')} placeholder={t('date_from')} value={from} onChange={setFrom} />
        <DateField w={{ base: '100%', xs: 140 }} aria-label={t('date_to')} placeholder={t('date_to')} value={to} onChange={setTo} />
        {filtersUsed && (
          <Button variant="subtle" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={() => changeState('list')}>
            {t('clear_filters')}
          </Button>
        )}
      </Group>

      {rows.length === 0 ? (
        <Paper withBorder>
          {state === 'empty' ? (
            <EmptyState icon={History} title={t('empty_title')} text={t('empty')} />
          ) : (
            <EmptyState icon={Search} text={t('no_results')} />
          )}
        </Paper>
      ) : (
        <>
          {groupByDay(rows, (e) => dayLabel(e.at)).map((g) => (
            <Stack key={g.label} gap={6}>
              <Group justify="space-between" align="baseline">
                <Text ff="heading" fw={600} size="lg">{g.label}</Text>
                <Text size="xs" c="dimmed">{t('entries_count', { count: g.items.length })}</Text>
              </Group>
              <Paper withBorder bg="dark.7" style={{ overflow: 'hidden', borderTop: 0 }}>
                {g.items.map((e) => (
                  <EntryRow key={e.id} entry={e} opened={openedId === e.id} onToggle={() => setOpenedId(openedId === e.id ? null : e.id)} />
                ))}
              </Paper>
            </Stack>
          ))}
          <ListPagination data={{ total: filtersUsed ? rows.length : TOTAL_ENTRIES, pageSize: 50 }} page={1} onChange={() => undefined} />
        </>
      )}
    </Stack>
  );
};
