import { describe, expect, it, vi } from 'vitest';

const { createPool } = vi.hoisted(() => ({ createPool: vi.fn(() => ({})) }));
vi.mock('mysql2/promise', () => ({ default: { createPool } }));

describe('pool', () => {
  // MySQL w Dockerze liczy NOW() i CURRENT_TIMESTAMP w UTC. Bez timezone 'Z' mysql2 czyta te godziny jako czas
  // polski i każda data z godziną (np. powiadomienie „dzisiaj, 14:32”) przesuwa się o 1–2 godziny.
  it('reads and writes DATETIME as UTC, like the database', async () => {
    await import('../pool');
    expect(createPool).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'Z', dateStrings: ['DATE'] }));
  });
});
