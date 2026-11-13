import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { SERVER_MESSAGES } from '@app/shared';
import { sendError } from './errors';

/**
 * Sprawdza parametry z adresu (np. listQuerySchema z @app/shared). Po sprawdzeniu `req.query` ma już
 * poprawione wartości (liczby, domyślne); błędny parametr → 400 z kluczem przy nazwie parametru.
 */
export function validateQuery(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!(path in fields)) fields[path] = issue.message;
      }
      return sendError(res, 400, SERVER_MESSAGES.invalidData, fields);
    }
    // W Express 5 `req.query` jest tylko do odczytu, więc podmieniamy je w ten sposób.
    Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true, enumerable: true });
    next();
  };
}
