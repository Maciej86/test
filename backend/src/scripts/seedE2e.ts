// Konta do testów w przeglądarce (npm run test:e2e). Woła je e2e/global-setup.ts z losowym hasłem w E2E_PASSWORD,
// za każdym razem od nowa (pracownik znów ma hasło tymczasowe). Nigdy na serwerze produkcyjnym.
import { pathToFileURL } from 'node:url';
import type { Role } from '@app/shared';
import { hashPassword } from '../auth/password';
import { pool } from '../db/pool';

export const E2E_ACCOUNTS = { admin: 'e2e.admin@test.local', employee: 'e2e.employee@test.local' } as const;
/** Konta zakładane przez testy w przeglądarce (np. e2e.tmp.1731600000000@test.local); usuwane przy każdym seedzie. */
export const E2E_TEMP_LOGIN_LIKE = 'e2e.tmp.%@test.local';
/** Typy urlopów dodawane przez testy w przeglądarce (np. „E2E 1731600000000”); bez wniosków, więc można je usunąć. */
export const E2E_TEMP_LEAVE_TYPE_LIKE = 'E2E %';

export interface E2eAccount {
  firstName: string;
  lastName: string;
  login: string;
  role: Role;
  mustChangePassword: boolean;
  passwordHash: string;
}

export const seedE2eAccounts = async (
  env: Record<string, string | undefined>,
  save: (account: E2eAccount) => Promise<void>,
): Promise<void> => {
  if (env.NODE_ENV === 'production') throw new Error('Konta testowe e2e nie powstają na serwerze produkcyjnym.');
  const password = env.E2E_PASSWORD;
  if (!password) throw new Error('Brak E2E_PASSWORD (ustawia je e2e/global-setup.ts).');
  const passwordHash = await hashPassword(password);
  await save({ firstName: 'Test', lastName: 'Administrator', login: E2E_ACCOUNTS.admin, role: 'admin', mustChangePassword: false, passwordHash });
  await save({ firstName: 'Test', lastName: 'Pracownik', login: E2E_ACCOUNTS.employee, role: 'employee', mustChangePassword: true, passwordHash });
};

const saveToDb = async (account: E2eAccount): Promise<void> => {
  await pool.query(
    `INSERT INTO users (first_name, last_name, login, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), password_hash = VALUES(password_hash), role = VALUES(role),
       must_change_password = VALUES(must_change_password), archived_at = NULL, archived_by = NULL`,
    [account.firstName, account.lastName, account.login, account.passwordHash, account.role, account.mustChangePassword ? 1 : 0],
  );
};

/** Porządek przed testami: bez kont i typów urlopów z poprzednich uruchomień (pule znikają z kontami, CASCADE). */
export const removeTemporaryData = async (): Promise<void> => {
  await pool.query('DELETE FROM users WHERE login LIKE ?', [E2E_TEMP_LOGIN_LIKE]);
  await pool.query('DELETE FROM leave_types WHERE name LIKE ?', [E2E_TEMP_LEAVE_TYPE_LIKE]);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  removeTemporaryData()
    .then(() => seedE2eAccounts(process.env, saveToDb))
    .then(() => pool.end())
    .catch(async (error: unknown) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
