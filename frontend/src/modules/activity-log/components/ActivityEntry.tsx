import { Badge, Button, Collapse, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import {
  ArrowRight, CalendarDays, ChevronDown, FileSignature, FolderKanban, PieChart, SquareKanban, Tags, UserRound, type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { describeActivity, formatTime, isPanelLink, type ActivityArea, type ActivityLogItem, type ActivityTone } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { formatChangeValue, formatContext } from '../activityValues';

const AREA_ICON: Record<ActivityArea, LucideIcon> = {
  leave_requests: CalendarDays,
  leave_pools: PieChart,
  tasks: SquareKanban,
  projects: FolderKanban,
  users: UserRound,
  leave_types: Tags,
  contract_types: FileSignature,
};

const TONE_COLOR: Record<ActivityTone, string> = { neutral: 'navy', positive: 'green', negative: 'red', muted: 'gray' };

/** „Przed → po” dla każdego zmienionego pola; stara wartość przekreślona i przygaszona. */
const Changes = ({ entry }: { entry: ActivityLogItem }) => {
  const { t } = useTranslation('activity-log');
  const fields = Object.entries(entry.changes);
  if (fields.length === 0) return <Text size="sm" c="dimmed">{t('no_changes')}</Text>;
  return (
    <Stack gap={6}>
      {fields.map(([field, c]) => {
        const before = formatChangeValue(field, c.before, t);
        return (
          <Group key={field} gap="xs" align="baseline" wrap="nowrap">
            <Text size="sm" c="dimmed" w={{ base: 110, sm: 150 }} style={{ flexShrink: 0 }}>
              {t(`fields.${field}`, { defaultValue: field })}
            </Text>
            <Group gap={6} align="baseline" wrap="wrap" style={{ minWidth: 0 }}>
              {before !== null && (
                <>
                  <Text size="sm" c="dimmed" td="line-through">{before}</Text>
                  <ArrowRight size={14} aria-hidden style={{ alignSelf: 'center', color: 'var(--mantine-color-dimmed)' }} />
                </>
              )}
              <Text size="sm" fw={500}>{formatChangeValue(field, c.after, t) ?? t('values.none')}</Text>
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
};

/** Przycisk do rekordu (rekord w archiwum: „Otwórz w archiwum”) albo informacja, że rekordu już nie ma. */
const OpenRecord = ({ entry }: { entry: ActivityLogItem }) => {
  const { t } = useTranslation('activity-log');
  if (entry.state === 'deleted') return <Text size="xs" c="dimmed">{t('deleted_hint')}</Text>;
  // Tylko adresy w panelu (jak w Powiadomieniach); inny adres z odpowiedzi nie staje się przyciskiem.
  if (!isPanelLink(entry.link)) return <Text size="xs" c="dimmed">{t('archived_hint')}</Text>;
  return (
    <Button
      component={Link}
      to={entry.link}
      size="xs"
      variant="default"
      leftSection={<ButtonIcon action="details" size={14} />}
      style={{ alignSelf: 'flex-start' }}
    >
      {entry.state === 'archived' ? t('open_in_archive') : t(`open.${entry.area}`)}
    </Button>
  );
};

/** Jeden wpis: godzina, ikona obszaru w kolorze rodzaju zmiany, co się stało, czego dotyczy, kto. Kliknięcie rozwija. */
export const ActivityEntry = ({ entry, opened, onToggle }: { entry: ActivityLogItem; opened: boolean; onToggle: () => void }) => {
  const { t } = useTranslation('activity-log');
  const Icon = AREA_ICON[entry.area];
  const { kind, tone } = describeActivity(entry.area, entry.action, entry.changes);
  const context = formatContext(entry.area, entry.entityContext, t);
  return (
    <div style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
      <UnstyledButton onClick={onToggle} aria-expanded={opened} w="100%" px="md" py="sm" bg={opened ? 'dark.6' : undefined} style={{ display: 'block' }}>
        <Group gap="md" wrap="nowrap" align="flex-start">
          <Text size="sm" c="dimmed" w={42} pt={4} style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(entry.createdAt)}
          </Text>
          <ThemeIcon variant="light" color={TONE_COLOR[tone]} size={30} radius="md" style={{ flexShrink: 0 }}>
            <Icon size={16} aria-hidden />
          </ThemeIcon>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="wrap">
              <Text fw={600}>{t(`actions.${kind}`)}</Text>
              {entry.state === 'deleted' && <Badge size="sm" variant="light" color="gray">{t('deleted')}</Badge>}
              {entry.state === 'archived' && <Badge size="sm" variant="light" color="gray">{t('archived')}</Badge>}
            </Group>
            <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
              {entry.entityName || t('unnamed', { id: entry.entityId })}
              {context && <Text span c="dimmed">{t('with_context', { context })}</Text>}
            </Text>
            <Text size="sm" c="dimmed" hiddenFrom="sm">{entry.userName}</Text>
          </Stack>
          <Text size="sm" c="dark.1" visibleFrom="sm" ta="right" w={180} pt={4} style={{ flexShrink: 0 }}>{entry.userName}</Text>
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
          <OpenRecord entry={entry} />
        </Stack>
      </Collapse>
    </div>
  );
};
