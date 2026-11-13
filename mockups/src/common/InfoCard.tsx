import type { ReactNode } from 'react';
import { Card, Group, Stack, Title } from '@mantine/core';

/**
 * Boks na pulpicie i w panelu: nagłówek, treść, przyciski akcji na dole (po prawej).
 * Karta ma tło inne niż panel (--app-panel-background w theme.css), więc boksy odcinają się od tła.
 */
export function InfoCard({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card withBorder radius="md" padding="lg" h="100%">
      <Stack gap="sm" h="100%">
        <Title order={3} size="h4">
          {title}
        </Title>
        <Stack gap="xs" style={{ flex: 1 }}>
          {children}
        </Stack>
        {actions && <Group justify="flex-end" gap="xs">{actions}</Group>}
      </Stack>
    </Card>
  );
}
