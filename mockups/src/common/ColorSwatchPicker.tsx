import { ColorSwatch, Group, Input } from '@mantine/core';
import { Check } from 'lucide-react';

/** Kolor Mantine z motywu jako zmienna CSS (odcień 8: biały napis na pasku jest czytelny). */
const swatchColor = (color: string) => `var(--mantine-color-${color}-8)`;

/** Mały kwadracik w kolorze (np. typ urlopu w tabeli, w filtrach Kalendarza). */
export const ColorMark = ({ color, label, size = 12 }: { color: string; label?: string; size?: number }) => (
  <ColorSwatch color={swatchColor(color)} size={size} radius={2} aria-label={label} style={{ flex: 'none' }} />
);

/**
 * Wybór koloru z kilku kwadratów (np. „Kolor w kalendarzu” typu urlopu): wybrany ma ptaszek i obwódkę. Nazwy kolorów
 * daje moduł (`labelOf`), bo to tekst dla człowieka.
 */
export const ColorSwatchPicker = <C extends string,>({ label, description, colors, value, onChange, labelOf }: {
  label: string;
  description?: string;
  colors: readonly C[];
  value: C;
  onChange: (color: C) => void;
  labelOf: (color: C) => string;
}) => (
  <Input.Wrapper label={label} description={description} inputWrapperOrder={['label', 'input', 'description']}>
    <Group gap="xs" mt={6} mb={4}>
      {colors.map((color) => (
        <ColorSwatch
          key={color}
          component="button"
          type="button"
          color={swatchColor(color)}
          radius={3}
          size={30}
          aria-label={labelOf(color)}
          aria-pressed={color === value}
          onClick={() => onChange(color)}
          style={{ cursor: 'pointer', outline: color === value ? '2px solid var(--mantine-color-dark-0)' : undefined, outlineOffset: 2 }}
        >
          {color === value && <Check size={16} />}
        </ColorSwatch>
      ))}
    </Group>
  </Input.Wrapper>
);
