import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime, type DateInput } from '@app/shared';

/**
 * Data na ekranie: zawsze `DD.MM.RRRR` (z godziną: `withTime`). Pusta wartość = szare „brak”.
 * `dimmed` dla nieaktywnych wierszy (np. zarchiwizowanych).
 */
export function DateText({ value, withTime = false, dimmed = false }: {
  value: DateInput;
  withTime?: boolean;
  dimmed?: boolean;
}) {
  const { t } = useTranslation();
  const text = withTime ? formatDateTime(value) : formatDate(value);
  return (
    <Text span inherit c={text === null || dimmed ? 'dimmed' : undefined}>
      {text ?? t('empty_value')}
    </Text>
  );
}
