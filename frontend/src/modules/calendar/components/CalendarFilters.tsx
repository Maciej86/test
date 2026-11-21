import { Chip, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { CalendarAbsence, LeaveTypeColor } from '@app/shared';
import { ColorMark } from '../../../common/ColorSwatchPicker';
import { SearchField } from '../../../common/SearchField';

/** Kolory typów widocznych w zakresie, każdy z nazwami typów (np. „Wypoczynkowy, Na żądanie”). */
export const legendOf = (absences: CalendarAbsence[]): { color: LeaveTypeColor; label: string }[] => {
  const byColor = new Map<LeaveTypeColor, Set<string>>();
  for (const a of absences) byColor.set(a.color, (byColor.get(a.color) ?? new Set()).add(a.leaveTypeName));
  return [...byColor].map(([color, names]) => ({ color, label: [...names].sort((x, y) => x.localeCompare(y, 'pl')).join(', ') }));
};

/** Wyszukiwarka osób i przyciski kolorów (zarazem legenda): wyłączony kolor chowa paski tych typów. */
export const CalendarFilters = ({ search, onSearch, absences, hidden, onHidden }: {
  search: string;
  onSearch: (search: string) => void;
  absences: CalendarAbsence[];
  hidden: LeaveTypeColor[];
  onHidden: (hidden: LeaveTypeColor[]) => void;
}) => {
  const { t } = useTranslation('calendar');
  const legend = legendOf(absences);
  const shown = legend.map((l) => l.color).filter((c) => !hidden.includes(c));
  const change = (next: string[]) => onHidden([...hidden.filter((c) => !legend.some((l) => l.color === c)), ...legend.map((l) => l.color).filter((c) => !next.includes(c))]);
  return (
    <Group gap="md" align="center" wrap="wrap">
      <SearchField label={t('search')} value={search} onChange={onSearch} w={{ base: '100%', sm: 260 }} />
      {legend.length > 0 && (
        <Chip.Group multiple value={shown} onChange={change}>
          <Group gap="xs" wrap="wrap" role="group" aria-label={t('filters')}>
            {legend.map((l) => (
              <Chip key={l.color} value={l.color} variant="outline" size="sm" icon={<ColorMark color={l.color} />}>
                {l.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      )}
    </Group>
  );
};
