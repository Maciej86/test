import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

function required(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Brakuje ${name} w pliku .env (${hint})`);
  return value;
}

export const env = {
  get JWT_SECRET() {
    return required('JWT_SECRET', 'skopiuj .env.example do .env');
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
};
