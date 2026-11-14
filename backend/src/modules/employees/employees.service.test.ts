import { describe, it } from 'vitest';

describe('employees service', () => {
  it.todo('toPool: 26 + 4 carried, 9 used → 21 left, 0 carried left');
  it.todo('toPool: nothing used → 4 carried left');
  it.todo('getOpenYear: no pools → current year in Europe/Warsaw');
  it.todo('getOpenYear: 2026 closed, 2027 open → 2027');
  it.todo('getPoolUsage returns zeros until my-leave replaces it');
  it.todo('listActiveUsers skips archived accounts');
  it.todo('getPool for an admin → null');
});
