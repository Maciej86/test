import { Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DateText } from '../../../common/DateText';
import { EmptyState } from '../../../common/EmptyState';

/** Kiedy trafiło do archiwum i kto to zrobił (osoba usunięta na stałe: sama data). */
export const ArchivedCell = ({ at, by }: { at: string; by: string | null }) => {
  const { t } = useTranslation('archive');
  return (
    <Stack gap={0}>
      <Text size="sm"><DateText value={at} /></Text>
      {by && <Text size="xs" c="dimmed">{t('archived_by', { name: by })}</Text>}
    </Stack>
  );
};

/** Pusta zakładka albo brak wyników, w ramce. */
export const ArchiveEmpty = ({ icon, title, text }: { icon?: Parameters<typeof EmptyState>[0]['icon']; title?: string; text: string }) => (
  <Paper withBorder p="xl">
    <EmptyState icon={icon} title={title} text={text} />
  </Paper>
);

export const Frame = ({ children }: { children: ReactNode }) => <Paper withBorder p="xl">{children}</Paper>;
