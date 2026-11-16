import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const required = (name: string, hint: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Brakuje ${name} w pliku .env (${hint})`);
  return value;
};

/** Krótszy sekret da się zgadnąć i podrobić ciasteczko logowania. Generowany ma 96 znaków. */
const JWT_SECRET_MIN_LENGTH = 32;

export const env = {
  get JWT_SECRET() {
    const secret = required('JWT_SECRET', 'skopiuj .env.example do .env');
    if (secret.length < JWT_SECRET_MIN_LENGTH) {
      throw new Error(`JWT_SECRET w pliku .env jest za krótki (minimum ${JWT_SECRET_MIN_LENGTH} znaki); wygeneruj nowy losowy`);
    }
    return secret;
  },
  DB_HOST: process.env.DB_HOST ?? '127.0.0.1',
  DB_PORT: Number(process.env.DB_PORT ?? 3307),
  DB_USER: process.env.DB_USER ?? 'app',
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
  DB_NAME: process.env.DB_NAME ?? 'app',
  PORT: Number(process.env.PORT ?? 3001),
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  /** Folder plików od użytkowników: domyślnie uploads/ w głównym folderze projektu (na serwerze wolumen Dockera). */
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? fileURLToPath(new URL('../../uploads', import.meta.url)),
  /** Godziny kopii zapasowych w czasie polskim (te same co w scripts/backup/app-backup.timer); pusto = domyślne. */
  BACKUP_SLOTS: process.env.BACKUP_SLOTS ?? '',
  /** Adres alarmu o kopiach (tylko na serwerze, gdy aplikacja wysyła e-maile); pusto = bez alarmu. */
  BACKUP_ALERT_EMAIL: process.env.BACKUP_ALERT_EMAIL ?? '',
  /** Serwer poczty: lokalnie Mailpit (127.0.0.1:1025), na serwerze Mailgun (smtp.eu.mailgun.org:587). */
  SMTP_HOST: process.env.SMTP_HOST ?? '127.0.0.1',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 1025),
  /** Pusty login = serwer bez logowania (Mailpit). */
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? '',
  /** Adres nadawcy; nazwę nadawcy bierze sendEmail z common.app_name. */
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'no-reply@localhost',
};
