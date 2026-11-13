import { Center, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { translateKey } from '@app/shared';

/** Zaślepka zamiast ekranu modułu, który jest już zrobiony w prawdziwej aplikacji. */
/** labelKey = etykieta pozycji nawigacji modułu, np. 'orders.nav'. */
export function Done({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation();
  return (
    <Center p="xl">
      <Stack align="center" gap="xs">
        <Text fw={700}>{translateKey(t, labelKey)}</Text>
        <Text>{t('mockup.done')}</Text>
        <Text c="dimmed" size="sm">{t('mockup.done_link')}</Text>
      </Stack>
    </Center>
  );
}
