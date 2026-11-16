import type { ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';

/**
 * Nagłówek ekranu panelu: tytuł, szara linijka pod nim (np. podsumowanie liczb) i przyciski po prawej.
 *
 *   <PageHeader title={t('title')} subtitle={t('summary', { count })} actions={<AddButton />} />
 */
export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) => {
  return (
    <Group justify="space-between" align="flex-end">
      <Stack gap={2}>
        <Title order={1}>{title}</Title>
        {subtitle && <Text c="dimmed" size="sm">{subtitle}</Text>}
      </Stack>
      {actions && <Group gap="md">{actions}</Group>}
    </Group>
  );
};
