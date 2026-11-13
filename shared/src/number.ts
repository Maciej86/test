import { CURRENCY_SYMBOL, DECIMAL_SEPARATOR, MONEY_DECIMALS, THOUSAND_SEPARATOR } from './constants/numbers';

/**
 * Jedyne miejsce, w którym aplikacja zamienia liczby i kwoty na tekst: `1 234,50 zł`, `12 500`, `7,5`.
 * Przyjmuje też tekst, bo mysql2 zwraca kolumny DECIMAL jako tekst ("1234.50"). Pusta lub błędna wartość → `null`.
 */
export type NumberValue = number | string | null | undefined;

function toNumber(value: NumberValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
}

/**
 * Liczba z separatorem tysięcy i przecinkiem. `decimals` ustawia stałą liczbę miejsc po przecinku; bez niego
 * pokazuje tyle, ile potrzeba (najwyżej 2), np. `7,5`, `12`.
 */
export function formatNumber(value: NumberValue, decimals?: number): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  const fixed = Math.abs(n).toFixed(decimals ?? 2);
  let [whole, fraction = ''] = fixed.split('.');
  if (decimals === undefined) fraction = fraction.replace(/0+$/, '');
  const sign = n < 0 && Number(fixed) !== 0 ? '-' : '';
  return `${sign}${group(whole)}${fraction ? DECIMAL_SEPARATOR + fraction : ''}`;
}

/** Kwota: `1 234,50 zł` (zawsze 2 miejsca po przecinku). */
export function formatMoney(value: NumberValue): string | null {
  const text = formatNumber(value, MONEY_DECIMALS);
  return text === null ? null : `${text}${THOUSAND_SEPARATOR}${CURRENCY_SYMBOL}`;
}
