import { useCallback, useEffect, useRef, useState } from 'react';
import { IDLE_LOGOUT_MS, IDLE_WARNING_MS, SESSION_KEEPALIVE_MS, USER_ACTIVITY_HEADER } from '@app/shared';
import { api } from '../api/client';
import { isRecentlyActive, lastActivityAt, markActivity } from './activity';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart'] as const;
const TICK_MS = 1000;

/** Potwierdzenie dla serwera, że osoba pracuje: przedłuża sesję także przy pracy bez zapytań (np. długie pisanie). */
const keepSessionAlive = () => {
  void api.get('/auth/me', { headers: { [USER_ACTIVITY_HEADER]: '1' } }).catch(() => undefined);
};

/**
 * Wylogowanie po bezczynności: po IDLE_LOGOUT_MS − IDLE_WARNING_MS bez czynności ostrzeżenie z odliczaniem, po
 * IDLE_LOGOUT_MS `onIdle()`. Czynność w innej karcie (localStorage) też się liczy. Przy otwartym ostrzeżeniu ruch
 * myszy go nie zamyka; zamyka tylko `stay()` (przycisk), żeby nikt nie przedłużył sesji przypadkiem.
 */
export const useIdleLogout = (onIdle: () => void) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const warningOpen = useRef(false);
  const lastPing = useRef(Date.now());
  const loggedOut = useRef(false);

  useEffect(() => {
    // Wejście do panelu (np. zaraz po zalogowaniu, bez przeładowania strony) to czynność: liczymy od teraz,
    // nie od czynności sprzed wylogowania.
    markActivity();
    let lastMark = 0;
    const onActivity = () => {
      if (warningOpen.current) return;
      const now = Date.now();
      if (now - lastMark < TICK_MS) return;
      lastMark = now;
      markActivity(now);
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true });

    const timer = window.setInterval(() => {
      if (loggedOut.current) return;
      const now = Date.now();
      const idle = now - lastActivityAt();
      if (idle >= IDLE_LOGOUT_MS) {
        loggedOut.current = true;
        onIdle();
        return;
      }
      if (idle >= IDLE_LOGOUT_MS - IDLE_WARNING_MS) {
        warningOpen.current = true;
        setSecondsLeft(Math.ceil((IDLE_LOGOUT_MS - idle) / 1000));
        return;
      }
      warningOpen.current = false;
      setSecondsLeft(null);
      if (isRecentlyActive(now) && now - lastPing.current >= SESSION_KEEPALIVE_MS) {
        lastPing.current = now;
        keepSessionAlive();
      }
    }, TICK_MS);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
      window.clearInterval(timer);
    };
  }, [onIdle]);

  const stay = useCallback(() => {
    const now = Date.now();
    markActivity(now);
    warningOpen.current = false;
    setSecondsLeft(null);
    lastPing.current = now;
    keepSessionAlive();
  }, []);

  return { warning: secondsLeft !== null, secondsLeft: secondsLeft ?? 0, stay };
};
