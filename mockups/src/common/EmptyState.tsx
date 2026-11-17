import type { ReactNode } from 'react';
import { Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { LucideIcon } from 'lucide-react';

/**
 * Pusta lista albo brak wyników: ikona (opcjonalnie), tytuł (opcjonalnie), jedno zdanie i przycisk (np. „Dodaj”).
 * Ramkę (`Paper`) dokłada ekran, jeśli jej potrzebuje. Tego samego klocka używa `DataState` przy `isEmpty`.
 */
export const EmptyState = ({ icon: Icon, title, text, action }: {
  icon?: LucideIcon;
  title?: string;
  text: string;
  action?: ReactNode;
}) => {
  return (
    <Stack align="center" gap="sm" ta="center" py="xl" px="md">
      {Icon && (
        <ThemeIcon variant="light" size={48} radius="md">
          <Icon size={26} aria-hidden />
        </ThemeIcon>
      )}
      {title && <Title order={3}>{title}</Title>}
      <Text c="dimmed" maw={460}>{text}</Text>
      {action}
    </Stack>
  );
};
