import type mysql from 'mysql2/promise';
import { pool } from '../db/pool';
import { backupHealth, shouldAlert, type BackupHealth, type BackupRun } from './health';

// Pilnowanie kopii: co godzinę sprawdza tabelę backup_runs i wysyła alarm, gdy kopia się nie udała albo przepadła.
// Podpinane w module „Publikacja” (deploy-ovh.md): migracje z db/sql/backup_runs.sql i db/sql/system_alerts.sql,
// a w server.ts startBackupWatch(...) z funkcją wysyłającą e-mail, gdy aplikacja ma moduł E-mail.

const ALERT_KEY = 'backup';
const CHECK_EVERY_MS = 60 * 60 * 1000;
/** Wiersze backup_runs starsze niż najdłuższa ochrona kopii są już niepotrzebne. */
const KEEP_RUNS_DAYS = 400;

export const loadBackupHealth = async (now: Date, slots: string[], db: Pick<mysql.Pool, 'query'> = pool): Promise<BackupHealth> => {
  const [runs] = await db.query<mysql.RowDataPacket[]>(
    "SELECT started_at, status, error FROM backup_runs WHERE status <> 'skipped' ORDER BY started_at DESC LIMIT 1",
  );
  const [success] = await db.query<mysql.RowDataPacket[]>(
    "SELECT MAX(started_at) AS at FROM backup_runs WHERE status = 'success'",
  );
  const row = runs[0];
  const lastRun: BackupRun | null = row
    ? { startedAt: new Date(row.started_at), status: row.status, error: row.error ?? null }
    : null;
  const lastSuccessAt = success[0]?.at ? new Date(success[0].at) : null;
  return backupHealth({ lastRun, lastSuccessAt, now, slots });
};

/** Jedno sprawdzenie. `sendAlert` dostaje stan i wysyła e-mail (treść z shared/locales/pl/email.json). */
export const checkBackups = async (input: {
  now: Date;
  slots: string[];
  sendAlert: (health: BackupHealth) => Promise<void>;
  db?: Pick<mysql.Pool, 'query'>;
}): Promise<boolean> => {
  const db = input.db ?? pool;
  const health = await loadBackupHealth(input.now, input.slots, db);
  const [sent] = await db.query<mysql.RowDataPacket[]>('SELECT last_sent_at FROM system_alerts WHERE alert_key = ?', [
    ALERT_KEY,
  ]);
  const lastSentAt = sent[0]?.last_sent_at ? new Date(sent[0].last_sent_at) : null;
  await db.query('DELETE FROM backup_runs WHERE started_at < ?', [
    new Date(input.now.getTime() - KEEP_RUNS_DAYS * 24 * 3600 * 1000),
  ]);
  if (!shouldAlert(health, lastSentAt, input.now)) return false;
  await input.sendAlert(health);
  // Zapis po wysłaniu: restart backendu nie wyśle tego samego maila drugi raz.
  await db.query(
    'INSERT INTO system_alerts (alert_key, last_sent_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_sent_at = VALUES(last_sent_at)',
    [ALERT_KEY, input.now],
  );
  return true;
};

/** Sprawdzenie co godzinę. Błąd jednego sprawdzenia trafia do logu i nie zatrzymuje aplikacji. */
export const startBackupWatch = (slots: string[], sendAlert: (health: BackupHealth) => Promise<void>): NodeJS.Timeout => {
  const run = () =>
    checkBackups({ now: new Date(), slots, sendAlert }).catch((error: unknown) => console.error('backup watch', error));
  return setInterval(run, CHECK_EVERY_MS);
};
