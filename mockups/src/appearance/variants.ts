import { variantA, variantB, variantC } from '@app/shared/theme.variants';
import type { ThemeVariant } from './ThemeVariants';

/**
 * Warianty wyglądu do porównania w module „Wygląd” (przełącznik „Wariant” w pasku makiety).
 * Poza tym modułem lista jest pusta: makiety i aplikacja używają motywu z shared/src/theme.ts.
 * Palety: shared/src/theme.variants.ts. Czcionki wariantów: mockups/src/appearance/variants.css.
 */
export const THEME_VARIANTS: ThemeVariant[] = [
  { key: 'a', label: 'A. Granat klasyczny', theme: variantA },
  { key: 'b', label: 'B. Atrament', theme: variantB },
  { key: 'c', label: 'C. Nocny granat', theme: variantC },
];
