import { DateInput, type DateInputProps } from '@mantine/dates';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DATE_FORMAT, parseTypedDate } from '@app/shared';

/**
 * Pole daty w formularzu: kalendarz do kliknięcia albo wpisanie `DD.MM.RRRR`. Wartość to `RRRR-MM-DD`
 * (jak kolumna DATE i `isoDate` w schemacie) albo null, gdy pole jest puste.
 */
export const DateField = ({ value, onChange, ...props }: Omit<DateInputProps, 'value' | 'onChange'> & {
  value: string | null;
  onChange: (value: string | null) => void;
}) => {
  const { t } = useTranslation();
  return (
    <DateInput
      {...props}
      value={value || null}
      onChange={(v) => onChange(v ? String(v) : null)}
      valueFormat={DATE_FORMAT}
      dateParser={parseTypedDate}
      locale="pl"
      clearable
      leftSection={<Calendar size={16} />}
      placeholder={props.placeholder ?? t('date_placeholder')}
    />
  );
};
