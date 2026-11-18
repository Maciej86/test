import { ActionIcon, Group } from '@mantine/core';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Strzałki kolejności na liście (typy urlopów, typy umów, projekty): pierwsza pozycja nie idzie wyżej, ostatnia niżej.
 * `onMove(-1)` = wyżej, `onMove(1)` = niżej.
 */
export const OrderArrows = ({ index, count, onMove }: { index: number; count: number; onMove?: (direction: -1 | 1) => void }) => {
  const { t } = useTranslation();
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_up')} disabled={index === 0} onClick={() => onMove?.(-1)}>
        <ChevronUp size={16} />
      </ActionIcon>
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_down')} disabled={index === count - 1} onClick={() => onMove?.(1)}>
        <ChevronDown size={16} />
      </ActionIcon>
    </Group>
  );
};
