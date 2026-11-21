import { ActionIcon, Button, Group, Text } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CALENDAR_STEP_DAYS, formatDate } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';

/** Pasek nad siatką: zakres dni, strzałki o 30 dni i „Dziś” (wyszarzony, gdy zakres zaczyna się dziś). */
export const CalendarToolbar = ({ from, to, today, onShift, onToday }: {
  from: string;
  to: string;
  today: string;
  onShift: (days: number) => void;
  onToday: () => void;
}) => {
  const { t } = useTranslation('calendar');
  return (
    <Group gap="xs" p="xs" justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
      <Group gap="xs" wrap="nowrap">
        <ActionIcon variant="default" size="lg" aria-label={t('previous', { count: CALENDAR_STEP_DAYS })} onClick={() => onShift(-CALENDAR_STEP_DAYS)}>
          <ChevronLeft size={18} />
        </ActionIcon>
        <Text fw={600} miw={{ base: 0, sm: 210 }} ta="center">{formatDate(from)} – {formatDate(to)}</Text>
        <ActionIcon variant="default" size="lg" aria-label={t('next', { count: CALENDAR_STEP_DAYS })} onClick={() => onShift(CALENDAR_STEP_DAYS)}>
          <ChevronRight size={18} />
        </ActionIcon>
      </Group>
      <Button variant="default" leftSection={<ButtonIcon action="calendar" />} onClick={onToday} disabled={from === today}>
        {t('today')}
      </Button>
    </Group>
  );
};
