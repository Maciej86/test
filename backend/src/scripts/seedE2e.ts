// Konta do testów w przeglądarce (npm run test:e2e). Woła je e2e/global-setup.ts z losowym hasłem w E2E_PASSWORD,
// za każdym razem od nowa (pracownik znów ma hasło tymczasowe). Nigdy na serwerze produkcyjnym.
import { pathToFileURL } from 'node:url';
import type { Role } from '@app/shared';
import { hashPassword } from '../auth/password';
import { pool } from '../db/pool';

export const E2E_ACCOUNTS = { admin: 'e2e.admin@test.local', employee: 'e2e.employee@test.local' } as const;

export interface E2eAccount {
  name: string;
  login: string;
  role: Role;
  mustChangePassword: boolean;
  passwordHash: string;
}

export async function seedE2eAccounts(
  env: Record<string, string | undefined>,
  save: (account: E2eAccount) => Promise<void>,
): Promise<void> {
  if (env.NODE_ENV === 'production') throw new Error('Konta testowe e2e nie powstają na serwerze produkcyjnym.');
  const password = env.E2E_PASSWORD;
  if (!password) throw new Error('Brak E2E_PASSWORD (ustawia je e2e/global-setup.ts).');
  const passwordHash = await hashPassword(password);
  await save({ name: 'Test Administrator', login: E2E_ACCOUNTS.admin, role: 'admin', mustChangePassword: false, passwordHash });
  await save({ name: 'Test Pracownik', login: E2E_ACCOUNTS.employee, role: 'employee', mustChangePassword: true, passwordHash });
}

async function saveToDb(account: E2eAccount): Promise<void> {
  await pool.query(
    `INSERT INTO users (name, login, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role),
       must_change_password = VALUES(must_change_password), archived_at = NULL, archived_by = NULL`,
    [account.name, account.login, account.passwordHash, account.role, account.mustChangePassword ? 1 : 0],
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  seedE2eAccounts(process.env, saveToDb)
    .then(() => pool.end())
    .catch(async (error: unknown) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
