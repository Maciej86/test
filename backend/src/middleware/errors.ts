import type { Response } from 'express';

/**
 * Jedyny format błędu API: klucze tekstów, właściwy kod HTTP. `extra` = dodatkowe dane dla ekranu
 * (np. `archivedUser` przy loginie zajętym przez konto w archiwum).
 */
export function sendError(res: Response, status: number, message: string, fields?: Record<string, string>, extra?: Record<string, unknown>) {
  res.status(status).json({ error: { message, ...(fields ? { fields } : {}), ...extra } });
}
