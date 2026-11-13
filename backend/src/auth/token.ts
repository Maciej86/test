import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { isRole, type SessionUser } from '@app/shared';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, TOKEN_TTL } from '../config/constants';
import { env } from '../env';

export function signToken(user: SessionUser): string {
  return jwt.sign({ id: user.id, name: user.name, role: user.role }, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/** Zwraca użytkownika z tokenu albo null (zły podpis, wygasły token, nieznana rola). */
export function verifyToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload !== 'object' || payload === null) return null;
    const { id, name, role } = payload as Record<string, unknown>;
    if (typeof id !== 'number' || typeof name !== 'string' || !isRole(role)) return null;
    return { id, name, role };
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production' });
}
