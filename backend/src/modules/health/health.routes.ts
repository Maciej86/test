import { Router } from 'express';
import { SERVER_MESSAGES } from '@app/shared';
import { pool } from '../../db/pool';

// rule-ok: trasy publiczne bez logowania, testy w app.test.ts
export const healthRoutes = Router();

healthRoutes.get('/health', (_req, res) => {
  res.json({ ok: true });
});

healthRoutes.get('/health/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, error: { message: SERVER_MESSAGES.dbDown } });
  }
});
