import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Przed testami: sprzątanie po przerwanym przebiegu i stałe konta testowe e2e.admin / e2e.employee w lokalnej bazie
 * (brakujące powstają, istniejące dostają hasło E2E_PASSWORD z pliku .env). Wymaga bazy (npm run db) i tabel
 * (npm run migrate).
 */
const globalSetup = () => {
  if (!process.env.E2E_PASSWORD) throw new Error('Brak E2E_PASSWORD w pliku .env (hasło stałych kont testowych).');
  execFileSync('npm', ['run', 'seed:e2e', '-w', '@app/backend'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: process.env,
    stdio: 'inherit',
  });
};
export default globalSetup;
