import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME, TOKEN_TTL } from '../config/constants';
import { env } from '../env';

/**
 * Token zawiera tylko numer konta i wersję sesji (`users.token_version`); imię, rolę i stan konta `authenticate`
 * czyta z bazy przy każdym żądaniu. Zmiana hasła podnosi wersję, więc starsze tokeny przestają działać.
 */
export function signToken(user: { id: number }, tokenVersion: number): string {
  return jwt.sign({ id: user.id, ver: tokenVersion }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: TOKEN_TTL });
}

/** Numer konta, wersja sesji i chwila wystawienia tokenu albo null (zły podpis, wygasły token, brak wersji). */
export function verifyToken(token: string): { id: number; tokenVersion: number; issuedAtMs: number } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || payload === null) return null;
    const { id, ver, iat } = payload as Record<string, unknown>;
    if (typeof id !== 'number' || typeof ver !== 'number' || typeof iat !== 'number') return null;
    return { id, tokenVersion: ver, issuedAtMs: iat * 1000 };
  } catch {
    return null;
  }
}

/** Ciasteczko sesji bez daty wygaśnięcia: znika po zamknięciu przeglądarki. */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production' });
}
