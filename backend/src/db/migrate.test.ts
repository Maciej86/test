import { describe, expect, it } from 'vitest';
import { pendingMigrations } from './migrate';

describe('pendingMigrations', () => {
  it('returns new migration files in order, skipping applied and unrelated files', () => {
    expect(
      pendingMigrations(['002_b.sql', '001_a.sql', 'notatka.txt', '003_c.sql'], ['001_a.sql']),
    ).toEqual(['002_b.sql', '003_c.sql']);
  });

  it('ignores files that do not follow the NNN_name.sql pattern', () => {
    expect(pendingMigrations(['1_a.sql', '001_Zamowienia.sql', '004_orders.sql'], [])).toEqual([
      '004_orders.sql',
    ]);
  });
});
