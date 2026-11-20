import type { ReactNode } from 'react';
import { Group, Text } from '@mantine/core';

/**
 * Wiersz „etykieta – wartość” w szczegółach (wniosek, Moje konto): przygaszona etykieta po lewej, wartość po prawej;
 * na wąskim ekranie wartość schodzi pod etykietę, a długi tekst się łamie.
 *
 *   <DetailRow label={t('login')}>{account.login}</DetailRow>
 */
export const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <Group gap="md" align="flex-start" wrap="wrap" style={{ rowGap: 2 }}>
    <Text size="sm" c="dimmed" w={140} style={{ flex: 'none' }}>{label}</Text>
    <Text size="sm" component="div" style={{ flex: 1, minWidth: 180, overflowWrap: 'anywhere' }}>{children}</Text>
  </Group>
);
