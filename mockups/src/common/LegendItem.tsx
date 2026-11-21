import type { CSSProperties } from 'react';
import { Box, Group, Text } from '@mantine/core';

/**
 * Pozycja legendy: mały wzór (kolor, ramka, linia) i przygaszony podpis. Pasek nieobecności (Pulpit, szczegóły
 * wniosku) i Kalendarz.
 *
 *   <LegendItem label={t('off_day')} swatch={{ border: '1px dashed var(--mantine-color-dark-4)' }} />
 */
export const LegendItem = ({ label, swatch, w = 10, h = 10 }: { label: string; swatch: CSSProperties; w?: number; h?: number }) => (
  <Group gap={6} wrap="nowrap">
    <Box w={w} h={h} style={{ borderRadius: 2, flex: 'none', ...swatch }} />
    <Text size="xs" c="dimmed">{label}</Text>
  </Group>
);
