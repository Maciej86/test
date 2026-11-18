import type { PoolConnection } from 'mysql2/promise';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Db } from '../pool';

const { createPool } = vi.hoisted(() => ({ createPool: vi.fn(() => ({})) }));
vi.mock('mysql2/promise', () => ({ default: { createPool } }));

describe('pool', () => {
  // Baza liczy NOW() i CURRENT_TIMESTAMP w UTC. Bez timezone 'Z' mysql2 czyta te godziny jako czas polski
  // i każda data z godziną (np. „dzisiaj, 14:32”) przesuwa się o 1–2 godziny.
  it('reads and writes DATETIME as UTC, like the database, and DATE as text', async () => {
    await import('../pool');
    expect(createPool).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'Z', dateStrings: ['DATE'] }));
  });

  it('Db accepts both the pool and a transaction connection', async () => {
    const { pool } = await import('../pool');
    expectTypeOf(pool).toMatchTypeOf<Db>();
    expectTypeOf<PoolConnection>().toMatchTypeOf<Db>();
  });
});
