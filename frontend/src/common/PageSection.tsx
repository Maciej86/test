import type { ReactNode } from 'react';
import { Box, Container } from '@mantine/core';

const BACKGROUNDS = {
  default: 'var(--mantine-color-body)',
  alt: 'var(--mantine-color-default-hover)',
  primary: 'var(--mantine-primary-color-light)',
} as const;

/**
 * Sekcja strony dla odwiedzających: tło na całą szerokość okna, treść w środku w kontenerze.
 * Kolejne sekcje zmieniają tło (`default` / `alt`), żeby było widać, gdzie kończy się jedna, a zaczyna druga.
 */
export function PageSection({ background = 'default', children }: {
  background?: keyof typeof BACKGROUNDS;
  children: ReactNode;
}) {
  return (
    <Box component="section" bg={BACKGROUNDS[background]} py={64}>
      <Container size="lg">{children}</Container>
    </Box>
  );
}
