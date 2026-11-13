import axios, { isAxiosError } from 'axios';
import { SERVER_MESSAGES, translateKey } from '@app/shared';
import type { TFunction } from 'i18next';
import { PASSWORD_CHANGE_PATH, SESSION_EXPIRED_PATH } from '../../config/constants';

/** Jedyny klient HTTP aplikacji. Moduły nie używają `fetch` ani własnego `axios.create`. */
export const api = axios.create({ baseURL: '/api', withCredentials: true });

/** Tekst błędu dla człowieka: tłumaczy klucz z odpowiedzi serwera. */
export function apiErrorMessage(err: unknown, t: TFunction): string {
  if (isAxiosError(err) && err.response) {
    const key = (err.response.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (key) return translateKey(t, key);
    return translateKey(t, 'server.error');
  }
  return translateKey(t, 'common.no_connection');
}

/** Przejście na inny adres; pełne przeładowanie czyści zalogowanego i pobrane dane. Podmieniane w testach. */
export const sessionRedirect = {
  go(path: string) {
    if (window.location.pathname !== path.split('?')[0]) window.location.assign(path);
  },
};

/** Tu 401 to zwykła odpowiedź („niezalogowany”, „zły login”), nie wygasła sesja. */
const NO_REDIRECT_ON_401 = ['/auth/me', '/auth/login'];

/**
 * Jedno miejsce na odpowiedzi o sesji, żeby moduły nie obsługiwały ich same: 401 → logowanie,
 * 403 „najpierw ustaw hasło” → ekran ustawienia hasła. Błąd idzie dalej, do ekranu, który wysłał zapytanie.
 */
export function handleSessionError(err: unknown): Promise<never> {
  if (isAxiosError(err) && err.response) {
    const url = err.config?.url ?? '';
    const key = (err.response.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (err.response.status === 401 && !NO_REDIRECT_ON_401.includes(url)) sessionRedirect.go(SESSION_EXPIRED_PATH);
    if (err.response.status === 403 && key === SERVER_MESSAGES.passwordChangeRequired) {
      sessionRedirect.go(PASSWORD_CHANGE_PATH);
    }
  }
  return Promise.reject(err);
}

api.interceptors.response.use(undefined, handleSessionError);
