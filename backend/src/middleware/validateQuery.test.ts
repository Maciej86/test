import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { listQuerySchema } from '@app/shared';
import { validateQuery } from './validateQuery';

const app = express();
app.get('/items', validateQuery(listQuerySchema(['name', 'created_at'])), (req, res) => {
  res.json(req.query);
});

describe('validateQuery', () => {
  it('passes checked values with defaults to the route', async () => {
    const res = await request(app).get('/items?page=2&search=kowal');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 2, search: 'kowal', sort: 'name', dir: 'asc' });
  });

  it('rejects sorting by a column outside the list', async () => {
    const res = await request(app).get('/items?sort=password_hash');
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      message: 'server.invalid_data',
      fields: { sort: 'validation.list_sort' },
    });
  });
});
