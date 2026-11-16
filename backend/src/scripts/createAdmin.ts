// Pierwszy administrator: `npm run admin` (w głównym folderze projektu). Pyta w terminalu o imię, login, e-mail
// do powiadomień i hasło. Hasło wpisuje się tylko tutaj, nigdy w rozmowie ani w plikach.
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { adminAccountSchema, createI18n, translateKey, type Role } from '@app/shared';
import { hashPassword } from '../auth/password';
import { pool } from '../db/pool';

export interface AdminRow {
  firstName: string;
  lastName: string;
  login: string;
  email: string | null;
  passwordHash: string;
  role: Role;
}

export interface AdminDeps {
  loginTaken(login: string): Promise<boolean>;
  emailTaken(email: string): Promise<boolean>;
  insert(row: AdminRow): Promise<number>;
}

export type AdminResult = { ok: true; id: number } | { ok: false; errors: Record<string, string> };

/** Sprawdza dane tymi samymi zasadami co aplikacja i zakłada konto administratora (bez hasła tymczasowego). */
export const createAdminAccount = async (input: unknown, deps: AdminDeps): Promise<AdminResult> => {
  const parsed = adminAccountSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { ok: false, errors };
  }
  const { firstName, lastName, login, email, password } = parsed.data;
  if (await deps.loginTaken(login)) return { ok: false, errors: { login: 'validation.login_taken' } };
  if (email && (await deps.emailTaken(email))) return { ok: false, errors: { email: 'validation.email_taken' } };
  const id = await deps.insert({ firstName, lastName, login, email, passwordHash: await hashPassword(password), role: 'admin' });
  return { ok: true, id };
};

/** Dostęp do bazy dla polecenia (login i e-mail sprawdzane także wśród kont w archiwum). */
const dbDeps: AdminDeps = {
  async loginTaken(login) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM users WHERE login = ?', [login]);
    return rows.length > 0;
  },
  async emailTaken(email) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM users WHERE email = ?', [email]);
    return rows.length > 0;
  },
  async insert(row) {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (first_name, last_name, login, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [row.firstName, row.lastName, row.login, row.email, row.passwordHash, row.role],
    );
    return result.insertId;
  },
};

const main = async () => {
  const i18n = createI18n();
  const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, { ns: 'login', ...options }) as string;
  const field = (key: string) => translateKey(i18n.t, key);

  // Wyjście, które można wyciszyć: hasło nie pojawia się na ekranie podczas wpisywania.
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const ask = (key: string) => rl.question(`${t(key)} `);
  const askHidden = async (key: string) => {
    process.stdout.write(`${t(key)} `);
    muted = true;
    const answer = await rl.question('');
    muted = false;
    process.stdout.write('\n');
    return answer;
  };

  console.log(t('admin_cli.intro'));
  try {
    for (;;) {
      const input = {
        firstName: await ask('admin_cli.first_name'),
        lastName: await ask('admin_cli.last_name'),
        login: await ask('admin_cli.login'),
        email: await ask('admin_cli.email'),
        password: await askHidden('admin_cli.password'),
      };
      const repeat = await askHidden('admin_cli.repeat_password');
      if (repeat !== input.password) {
        console.log(field('validation.passwords_differ'));
        continue;
      }
      const result = await createAdminAccount(input, dbDeps);
      if (result.ok) {
        console.log(t('admin_cli.created', { login: input.login.trim().toLowerCase() }));
        break;
      }
      for (const [name, key] of Object.entries(result.errors)) console.log(`${t(`admin_cli.field_${name}`)}: ${field(key)}`);
      if (result.errors.login === 'validation.login_taken') break;
      console.log(t('admin_cli.try_again'));
    }
  } finally {
    rl.close();
    await pool.end();
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
