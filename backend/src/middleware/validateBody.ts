import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { SERVER_MESSAGES } from '@app/shared';
import { sendError } from './errors';

/** Sprawdza dane tym samym schematem co formularz na froncie. Komunikaty pól to klucze validation.*. */
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!(path in fields)) fields[path] = issue.message;
      }
      return sendError(res, 400, SERVER_MESSAGES.invalidData, fields);
    }
    req.body = result.data;
    next();
  };
}
