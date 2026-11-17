import type { Response } from 'express';
import { SERVER_MESSAGES } from '@app/shared';
import { sendError } from './errors';

/**
 * Błąd z usługi modułu do odesłania przez trasę: status, klucz tekstu, błędy pól i dodatkowe dane dla ekranu
 * (np. `archivedUser`, gdy login jest zajęty przez konto w archiwum).
 */
export interface ServiceError {
  status: number;
  message: string;
  fields?: Record<string, string>;
  [extra: string]: unknown;
}

/** Wynik usługi: dane albo błąd. */
export type Result<T = { ok: true }> = T | { error: ServiceError };

export const fail = (status: number, message: string, extra: Omit<ServiceError, 'status' | 'message'> = {}): { error: ServiceError } => ({
  error: { ...extra, status, message },
});

/** Rekord nie istnieje albo jest poza zasięgiem tej osoby (cudzy rekord też daje 404, nie 403). */
export const notFound = (): { error: ServiceError } => fail(404, SERVER_MESSAGES.notFound);

/**
 * Numer rekordu z adresu: tylko same cyfry bez zera na początku (7, nie 1e3, 0x10, " 7" ani 007), inaczej 404.
 * Nie zamieniaj numeru z adresu przez `Number`: `Number('1e3')` to 1000, a `Number('0x10')` to 16.
 */
export const idParam = (res: Response, raw: unknown): number | null => {
  const id = typeof raw === 'string' && /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : Number.NaN;
  if (Number.isSafeInteger(id)) return id;
  sendError(res, 404, SERVER_MESSAGES.notFound);
  return null;
};

/** Wynik usługi → odpowiedź: błąd jednym formatem (`sendError`), sukces jako JSON. */
export const reply = <T>(res: Response, result: Result<T>, status = 200) => {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    const { status: code, message, fields, ...extra } = result.error as ServiceError;
    return sendError(res, code, message, fields, Object.keys(extra).length > 0 ? extra : undefined);
  }
  res.status(status).json(result);
};
