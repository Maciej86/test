import { createContext, useContext, useState, type ReactNode } from 'react';
import { MantineProvider, SegmentedControl, type MantineThemeOverride } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { colorSchemeProps, theme } from '@app/shared/theme';

/** Wariant wyglądu do porównania w module „Wygląd”. Lista: appearance/variants.ts. */
export interface ThemeVariant {
  key: string;
  label: string;
  theme: MantineThemeOverride;
}

const VariantContext = createContext<{ variants: ThemeVariant[]; current: string; setCurrent: (key: string) => void }>({
  variants: [],
  current: '',
  setCurrent: () => {},
});

/** Motyw makiet: wybrany wariant (gdy są warianty) albo motyw aplikacji z shared/src/theme.ts. */
export function ThemeVariantProvider({ variants, children }: { variants: ThemeVariant[]; children: ReactNode }) {
  const [current, setCurrent] = useState(variants[0]?.key ?? '');
  const active = variants.find((v) => v.key === current);
  return (
    <VariantContext.Provider value={{ variants, current, setCurrent }}>
      <MantineProvider theme={active?.theme ?? theme} {...colorSchemeProps()}>
        {children}
      </MantineProvider>
    </VariantContext.Provider>
  );
}

/** Przełącznik wariantów w pasku makiety; widoczny tylko, gdy są co najmniej dwa warianty. */
export function VariantSwitch() {
  const { t } = useTranslation();
  const { variants, current, setCurrent } = useContext(VariantContext);
  if (variants.length < 2) return null;
  return (
    <SegmentedControl
      aria-label={t('mockup.variant')}
      value={current}
      onChange={setCurrent}
      data={variants.map((v) => ({ value: v.key, label: v.label }))}
    />
  );
}
