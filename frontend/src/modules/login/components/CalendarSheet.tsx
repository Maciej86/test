import { Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatDateParts, todayIsoDate } from '@app/shared';

/** Kartka z kalendarza: dzisiejsza data dużym szeryfowym krojem, jak nagłówek pisma kadrowego (komputer). */
export const CalendarSheet = () => {
  const { t } = useTranslation('login');
  const today = formatDateParts(todayIsoDate())!;
  return (
    <Stack gap={0} pl="xl" style={{ borderLeft: '3px solid var(--mantine-color-navy-4)' }}>
      <Text size="lg" c="dimmed">{today.weekday}</Text>
      <Title order={2} fz={144} lh={1} fw={600}>{today.day}</Title>
      <Text ff="heading" fz={30} fw={500}>{today.monthYear}</Text>
      <Text mt="xl" fw={600} size="lg">{t('common:app_name')}</Text>
      <Text c="dimmed" maw={320}>{t('intro')}</Text>
    </Stack>
  );
};

/** Nazwa aplikacji i pełna data nad formularzem (telefon, zamiast kartki z kalendarza). */
export const PhoneHeader = () => {
  const { t } = useTranslation('login');
  const today = formatDateParts(todayIsoDate())!;
  return (
    <Stack gap={2} hiddenFrom="md" mb="lg">
      <Title order={2}>{t('common:app_name')}</Title>
      <Text c="dimmed" size="sm">{today.full}</Text>
    </Stack>
  );
};
