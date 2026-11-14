import type { TFunction } from 'i18next';
import { translateKey } from '@app/shared';

/** Błąd pola formularza: schemat i serwer podają klucz tekstu (np. validation.required), ekran pokazuje zdanie. */
export function fieldError(t: TFunction, key: unknown): string | undefined {
  return typeof key === 'string' && key ? translateKey(t, key) : undefined;
}
