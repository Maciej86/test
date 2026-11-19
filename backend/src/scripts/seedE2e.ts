// Konta do testów w przeglądarce (npm run test:e2e). Woła je e2e/global-setup.ts z hasłem E2E_PASSWORD z pliku .env,
// za każdym razem od nowa (pracownik znów ma hasło tymczasowe). Z `--cleanup` (npm run cleanup:e2e, woła je
// e2e/global-teardown.ts) tylko sprząta dane testowe. Nigdy na serwerze produkcyjnym.
import { pathToFileURL } from 'node:url';
import type { Role } from '@app/shared';
import { hashPassword } from '../auth/password';
import { pool } from '../db/pool';

export const E2E_ACCOUNTS = { admin: 'e2e.admin@test.local', employee: 'e2e.employee@test.local' } as const;
/** Konta zakładane przez testy w przeglądarce (np. e2e.tmp.1731600000000@test.local); usuwane przy każdym seedzie. */
export const E2E_TEMP_LOGIN_LIKE = 'e2e.tmp.%@test.local';
/** Projekty dodawane przez testy w przeglądarce (np. „E2E Projekt 1731600000000”); zadania znikają z nimi (CASCADE). */
export const E2E_TEMP_PROJECT_LIKE = 'E2E %';
/** Typy urlopów dodawane przez testy w przeglądarce (np. „E2E 1731600000000”); bez wniosków, więc można je usunąć. */
export const E2E_TEMP_LEAVE_TYPE_LIKE = 'E2E %';
/** Typy umów dodawane przez testy w przeglądarce (np. „E2E 1731600000000”). */
export const E2E_TEMP_CONTRACT_TYPE_LIKE = 'E2E %';

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

/**
 * Porządek przed testami i po nich: bez projektów, wniosków, kont, typów urlopów i typów umów z poprzednich uruchomień (pule znikają z kontami,
 * CASCADE). Typ umowy ma u pracowników RESTRICT, więc najpierw konta przestają go wskazywać.
 */
export const removeTemporaryData = async (env: Record<string, string | undefined>): Promise<void> => {
  if (env.NODE_ENV === 'production') throw new Error('Dane testowe e2e nie są sprzątane na serwerze produkcyjnym.');
  await pool.query('DELETE FROM projects WHERE name LIKE ?', [E2E_TEMP_PROJECT_LIKE]);
  // Wnioski mają RESTRICT do kont i typów, więc znikają pierwsze; stałe konto e2e pracownika zaczyna bez wniosków.
  await pool.query(
    'DELETE FROM leave_requests WHERE user_id IN (SELECT id FROM users WHERE login LIKE ? OR login = ?) OR leave_type_id IN (SELECT id FROM leave_types WHERE name LIKE ?)',
    [E2E_TEMP_LOGIN_LIKE, E2E_ACCOUNTS.employee, E2E_TEMP_LEAVE_TYPE_LIKE],
  );
  await pool.query('DELETE FROM users WHERE login LIKE ?', [E2E_TEMP_LOGIN_LIKE]);
  await pool.query('DELETE FROM leave_types WHERE name LIKE ?', [E2E_TEMP_LEAVE_TYPE_LIKE]);
  await pool.query('UPDATE users SET contract_type_id = NULL WHERE contract_type_id IN (SELECT id FROM contract_types WHERE name LIKE ?)', [
    E2E_TEMP_CONTRACT_TYPE_LIKE,
  ]);
  await pool.query('DELETE FROM contract_types WHERE name LIKE ?', [E2E_TEMP_CONTRACT_TYPE_LIKE]);
};

/** Dzwonek administratora e2e: dwa nieprzeczytane i jedno przeczytane powiadomienie, za każdym razem od nowa. */
export const seedE2eNotifications = async (): Promise<void> => {
  await pool.query('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE login IN (?))', [[E2E_ACCOUNTS.admin, E2E_ACCOUNTS.employee]]);
  const add = (readSql: 'NULL' | 'NOW() - INTERVAL 1 DAY', employee: string, dateFrom: string) =>
    pool.query(
      readSql === 'NULL'
        ? 'INSERT INTO notifications (user_id, type, params, actor_name, link, read_at) SELECT id, ?, ?, ?, ?, NULL FROM users WHERE login = ?'
        : 'INSERT INTO notifications (user_id, type, params, actor_name, link, read_at) SELECT id, ?, ?, ?, ?, NOW() - INTERVAL 1 DAY FROM users WHERE login = ?',
      [
        'leave_request_new',
        JSON.stringify({ employee, leaveType: 'Wypoczynkowy', dateFrom, dateTo: dateFrom, days: 1 }),
        employee,
        '/admin/leave-requests',
        E2E_ACCOUNTS.admin,
      ],
    );
  await add('NOW() - INTERVAL 1 DAY', 'Ewa Przeczytana', '2027-01-04');
  await add('NULL', 'Adam Pierwszy', '2027-01-05');
  await add('NULL', 'Basia Druga', '2027-01-06');
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const cleanupOnly = process.argv.includes('--cleanup');
  removeTemporaryData(process.env)
    .then(async () => {
      if (cleanupOnly) return;
      await seedE2eAccounts(process.env, saveToDb);
      await seedE2eNotifications();
    })
    .then(() => pool.end())
    .catch(async (error: unknown) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
