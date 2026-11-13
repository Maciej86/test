import type { Response } from 'express';

/** Jedyny format błędu API: klucze tekstów, właściwy kod HTTP. */
export function sendError(res: Response, status: number, message: string, fields?: Record<string, string>) {
  res.status(status).json({ error: fields ? { message, fields } : { message } });
}
