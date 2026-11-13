import mysql from 'mysql2/promise';
import { env } from '../env';

/** Wspólna pula połączeń z bazą. Zapytania zawsze z parametrami `?`. */
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
  charset: 'utf8mb4',
  // Kolumny DATE jako tekst RRRR-MM-DD: bez tego mysql2 robi z nich północ czasu serwera, a po zamianie na JSON
  // dzień potrafi przesunąć się o jeden wstecz. Formatowanie: formatDate z @app/shared.
  dateStrings: ['DATE'],
});
