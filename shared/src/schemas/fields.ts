import { z } from 'zod';

/**
 * Gotowe pola formularzy. Moduł składa z nich swój schemat (shared/src/schemas/<module>.ts), a ten sam schemat
 * sprawdza formularz (zodResolver) i serwer (validateBody). Pole samo porządkuje wartość przed zapisem
 * (spacje, kreski, małe litery), więc front i serwer zapisują to samo. Nowy format: dopisz tutaj, z testem
 * w fields.test.ts i tekstem w shared/locales/pl/validation.json.
 */
export const FIELD_MESSAGES = {
  required: 'validation.required',
  tooLong: 'validation.too_long',
  postalCode: 'validation.postal_code',
  nip: 'validation.nip',
  regon: 'validation.regon',
  pesel: 'validation.pesel',
  phone: 'validation.phone',
  email: 'validation.email_invalid',
  iban: 'validation.iban',
  money: 'validation.money',
  quantity: 'validation.quantity',
  min: 'validation.min',
  max: 'validation.max',
} as const;

const M = FIELD_MESSAGES;

/** Największe wartości kolumn DECIMAL(12,2) (kwoty) i DECIMAL(12,3) (ilości). */
export const MONEY_MAX = 9_999_999_999.99;
export const QUANTITY_MAX = 999_999_999.999;

const digitsOnly = (value: string) => value.replace(/[\s-]/g, '');

function weightedSum(digits: string, weights: number[]): number {
  return weights.reduce((sum, weight, i) => sum + weight * Number(digits[i]), 0);
}

export function isValidNip(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const check = weightedSum(value, [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
  return check !== 10 && check === Number(value[9]);
}

export function isValidRegon(value: string): boolean {
  const weights: Record<number, number[]> = {
    9: [8, 9, 2, 3, 4, 5, 6, 7],
    14: [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8],
  };
  if (!/^(\d{9}|\d{14})$/.test(value)) return false;
  const w = weights[value.length]!;
  const check = (weightedSum(value, w) % 11) % 10;
  return check === Number(value[value.length - 1]);
}

export function isValidPesel(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  const check = (10 - (weightedSum(value, [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]) % 10)) % 10;
  return check === Number(value[10]);
}

/** Polski numer konta: 26 cyfr, suma kontrolna IBAN (mod 97). */
export function isValidIban(value: string): boolean {
  if (!/^\d{26}$/.test(value)) return false;
  // „PL” = 25 21; dwie pierwsze cyfry (suma kontrolna) idą na koniec.
  const rearranged = value.slice(2) + '2521' + value.slice(0, 2);
  let rest = 0;
  for (const digit of rearranged) rest = (rest * 10 + Number(digit)) % 97;
  return rest === 1;
}

const textInput = () => z.string({ error: M.required });

/** Tekst wymagany: obcięte spacje, od 1 do max znaków (max = długość VARCHAR w migracji). */
export const text = (max: number) => textInput().trim().min(1, M.required).max(max, M.tooLong);

/** Kod pocztowy NN-NNN; „64300” zapisuje jako „64-300”. */
export const postalCode = textInput()
  .trim()
  .transform((v) => (/^\d{5}$/.test(v) ? `${v.slice(0, 2)}-${v.slice(2)}` : v))
  .pipe(z.string().regex(/^\d{2}-\d{3}$/, M.postalCode));

/** NIP: 10 cyfr z sumą kontrolną; zapisywany bez kresek, spacji i „PL”. */
export const nip = textInput()
  .transform((v) => digitsOnly(v).replace(/^PL/i, ''))
  .refine(isValidNip, M.nip);

/** REGON: 9 albo 14 cyfr z sumą kontrolną. */
export const regon = textInput().transform(digitsOnly).refine(isValidRegon, M.regon);

/** PESEL: 11 cyfr z sumą kontrolną. */
export const pesel = textInput().transform(digitsOnly).refine(isValidPesel, M.pesel);

/** Telefon: 9–15 cyfr, opcjonalnie z „+” na początku; zapisywany bez spacji, kresek i nawiasów. */
export const phone = textInput()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .pipe(z.string().regex(/^\+?\d{9,15}$/, M.phone));

/** E-mail: obcięte spacje, małe litery. */
export const email = textInput().trim().toLowerCase().pipe(z.email(M.email).max(190, M.tooLong));

/** Polski numer konta; zapisywany jako 26 cyfr, bez „PL” i spacji. */
export const iban = textInput()
  .transform((v) => digitsOnly(v).replace(/^PL/i, ''))
  .refine(isValidIban, M.iban);

/** Kwota: od 0 (albo min) do maksimum DECIMAL(12,2), najwyżej 2 miejsca po przecinku. */
export const moneyField = (min = 0, max = MONEY_MAX) =>
  z.number({ error: M.required }).min(min, M.min).max(max, M.max).multipleOf(0.01, M.money);
export const money = moneyField();

/** Ilość: od 0 (albo min) do maksimum DECIMAL(12,3), najwyżej 3 miejsca po przecinku. */
export const quantityField = (min = 0, max = QUANTITY_MAX) =>
  z.number({ error: M.required }).min(min, M.min).max(max, M.max).multipleOf(0.001, M.quantity);
export const quantity = quantityField();

/** Pole nieobowiązkowe: puste pole formularza (`''`, same spacje, brak) zapisuje się jako NULL. */
export function optionalField<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (v) => (v === undefined || v === '' || (typeof v === 'string' && v.trim() === '') ? null : v),
    schema.nullable(),
  );
}
