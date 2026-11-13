import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../env';

const MIGRATION_FILE = /^\d{3}_[a-z0-9_]+\.sql$/;
const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

/** Pliki migracji, których baza jeszcze nie ma, w kolejności numerów. */
export function pendingMigrations(files: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return files.filter((f) => MIGRATION_FILE.test(f) && !done.has(f)).sort();
}

/**
 * Uwaga: MySQL zatwierdza zmiany struktury (CREATE, ALTER, DROP) od razu, więc transakcja nie cofnie ich po błędzie.
 * Dlatego jedna migracja = jedna zmiana struktury. Gdy migracja przerwie się w połowie, cofnij ręcznie to, co
 * zdążyła utworzyć (opis błędu podaje nazwę pliku), popraw plik i uruchom ponownie.
 */
export async function runMigrations(conn: mysql.Connection, dir = MIGRATIONS_DIR): Promise<string[]> {
  await conn.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB',
  );
  const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT name FROM schema_migrations');
  const todo = pendingMigrations(await readdir(dir), rows.map((r) => String(r.name)));
  for (const file of todo) {
    const sql = await readFile(`${dir}/${file}`, 'utf8');
    await conn.beginTransaction(); // rule-ok: narzędzie migracji ma własne połączenie, nie trasa API
    try {
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw new Error(`Migracja ${file} nie powiodła się: ${(error as Error).message}`);
    }
  }
  return todo;
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });
  try {
    const applied = await runMigrations(conn);
    console.log(applied.length ? `Zastosowano: ${applied.join(', ')}` : 'Baza jest aktualna.');
  } finally {
    await conn.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
