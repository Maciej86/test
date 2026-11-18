import { ActionIcon, Group } from '@mantine/core';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OrderDirection } from '@app/shared';

/**
 * Strzałki kolejności na liście (typy urlopów, typy umów, projekty): pierwsza pozycja nie idzie wyżej, ostatnia
 * niżej. Kopia w makietach i we froncie musi być taka sama.
 */
export const OrderArrows = ({ index, count, onMove }: { index: number; count: number; onMove: (direction: OrderDirection) => void }) => {
  const { t } = useTranslation();
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_up')} disabled={index === 0} onClick={() => onMove('up')}>
        <ChevronUp size={16} />
      </ActionIcon>
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_down')} disabled={index === count - 1} onClick={() => onMove('down')}>
        <ChevronDown size={16} />
      </ActionIcon>
    </Group>
  );
};
